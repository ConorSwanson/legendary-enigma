import Foundation
import WebKit
import UIKit
import Combine

@MainActor
final class AuthManager: NSObject, ObservableObject {
    static let shared = AuthManager()

    @Published var isSignedIn: Bool = false
    @Published var isLoading: Bool = true

    // Single WebView instance, created at init so it's always available
    // for token refresh regardless of whether SignInView is visible.
    private(set) var webView: WKWebView
    private let coordinator: Coordinator

    private var pendingTokenContinuation: CheckedContinuation<String, Error>?
    private var refreshLoopTask: Task<Void, Never>?

    private override init() {
        let config = WKWebViewConfiguration()
        let wv = WKWebView(frame: .zero, configuration: config)
        wv.backgroundColor = UIColor(red: 3/255, green: 7/255, blue: 18/255, alpha: 1)
        wv.scrollView.backgroundColor = UIColor(red: 3/255, green: 7/255, blue: 18/255, alpha: 1)
        wv.isOpaque = false
        wv.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

        let coord = Coordinator()
        config.userContentController.add(coord, name: "clerkToken")
        wv.navigationDelegate = coord

        self.webView = wv
        self.coordinator = coord
        super.init()

        startUp()
    }

    // MARK: - Startup

    private func startUp() {
        // Load sign-in URL. If a Clerk session exists the SDK auto-redirects,
        // triggering token extraction. If not, the sign-in form is shown.
        webView.load(URLRequest(url: URL(string: Config.apiBaseURL + "/sign-in")!))

        let hasExistingToken = KeychainHelper.load(for: "clerk_token") != nil

        if !hasExistingToken {
            // First-ever launch — show sign-in immediately, no wait
            isLoading = false
            return
        }

        // Returning user: keep the loading spinner while Clerk restores the
        // session and posts a fresh token. Cap the wait at 5 seconds so a
        // network outage doesn't block the app forever.
        Task {
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            guard isLoading else { return } // token already arrived, nothing to do
            // Timed out — fall back to the Keychain token (may be stale)
            isSignedIn = true
            isLoading = false
            startRefreshLoop()
        }
    }

    // MARK: - Token handling

    func receivedTokenFromWebView(_ token: String) {
        if let cont = pendingTokenContinuation {
            pendingTokenContinuation = nil
            cont.resume(returning: token)
        } else {
            APIClient.shared.setToken(token)
            if !isSignedIn {
                isSignedIn = true
                startRefreshLoop()
            }
            isLoading = false
        }
    }

    func signOut() {
        stopRefreshLoop()
        APIClient.shared.clearToken()
        webView.load(URLRequest(url: URL(string: Config.apiBaseURL + "/sign-in")!))
        isSignedIn = false
    }

    // MARK: - Token refresh (called by the 50-second loop)

    func refreshToken() async {
        guard pendingTokenContinuation == nil else { return }

        let timeoutTask = Task {
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            if let cont = self.pendingTokenContinuation {
                self.pendingTokenContinuation = nil
                cont.resume(throwing: CancellationError())
            }
        }

        do {
            let tok = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<String, Error>) in
                pendingTokenContinuation = cont
                webView.evaluateJavaScript("""
                    window.Clerk?.session?.getToken().then(function(t) {
                        if(t) window.webkit.messageHandlers.clerkToken.postMessage(t);
                    });
                """)
            }
            timeoutTask.cancel()
            APIClient.shared.setToken(tok)
        } catch {
            timeoutTask.cancel()
        }
    }

    // MARK: - Refresh loop

    private func startRefreshLoop() {
        stopRefreshLoop()
        refreshLoopTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 50_000_000_000)
                guard !Task.isCancelled else { break }
                await self?.refreshToken()
            }
        }
    }

    private func stopRefreshLoop() {
        refreshLoopTask?.cancel()
        refreshLoopTask = nil
    }

    // MARK: - Coordinator (WKWebView delegate + message handler)

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "clerkToken", let token = message.body as? String else { return }
            AuthManager.shared.receivedTokenFromWebView(token)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard let url = webView.url else { return }
            let path = url.path
            if !path.contains("sign-in") && !path.contains("sign-up") && !path.contains("sso-callback") {
                extractToken(from: webView)
            }
        }

        private func extractToken(from webView: WKWebView) {
            webView.evaluateJavaScript("""
                (function tryGetToken(attempts) {
                    if (window.Clerk && window.Clerk.session) {
                        window.Clerk.session.getToken().then(function(t) {
                            if (t) window.webkit.messageHandlers.clerkToken.postMessage(t);
                            else if (attempts > 0) setTimeout(function() { tryGetToken(attempts-1); }, 1000);
                        }).catch(function() {
                            if (attempts > 0) setTimeout(function() { tryGetToken(attempts-1); }, 1000);
                        });
                    } else if (attempts > 0) {
                        setTimeout(function() { tryGetToken(attempts-1); }, 1000);
                    }
                })(8);
            """)
        }
    }
}
