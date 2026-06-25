import Foundation
import WebKit
import Combine

@MainActor
final class AuthManager: NSObject, ObservableObject {
    static let shared = AuthManager()

    @Published var isSignedIn: Bool = false
    @Published var isLoading: Bool = true

    // Background WKWebView used to maintain the Clerk session and refresh tokens
    private var webView: WKWebView?
    private var pendingTokenContinuation: CheckedContinuation<String, Error>?

    // Refresh loop — keeps the 60-second Clerk JWT fresh every 50 seconds
    private var refreshLoopTask: Task<Void, Never>?

    private override init() {
        super.init()
        checkExistingToken()
    }

    private func checkExistingToken() {
        if KeychainHelper.load(for: "clerk_token") != nil {
            isSignedIn = true
            startRefreshLoop()
        }
        isLoading = false
    }

    func signOut() {
        stopRefreshLoop()
        APIClient.shared.clearToken()
        webView?.load(URLRequest(url: URL(string: Config.apiBaseURL + "/sign-in")!))
        isSignedIn = false
    }

    /// Called by SignInWebView after successfully extracting the Clerk token
    func didReceiveToken(_ token: String) {
        APIClient.shared.setToken(token)
        if !isSignedIn {
            isSignedIn = true
            startRefreshLoop()
        }
    }

    /// Refreshes the token by injecting JS into the maintained web view.
    /// Guarded against concurrent calls; times out after 5 seconds.
    func refreshToken() async {
        guard let wv = webView, pendingTokenContinuation == nil else { return }

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
                wv.evaluateJavaScript("""
                    window.Clerk?.session?.getToken().then(function(t) {
                        if(t) window.webkit.messageHandlers.clerkToken.postMessage(t);
                    });
                """)
            }
            timeoutTask.cancel()
            APIClient.shared.setToken(tok)
        } catch {
            timeoutTask.cancel()
            // Refresh failed silently — next API call will surface a 401 if needed
        }
    }

    func attachWebView(_ webView: WKWebView) {
        self.webView = webView
    }

    func receivedTokenFromWebView(_ token: String) {
        if let cont = pendingTokenContinuation {
            pendingTokenContinuation = nil
            cont.resume(returning: token)
        } else {
            didReceiveToken(token)
        }
    }

    // MARK: - Refresh loop

    private func startRefreshLoop() {
        stopRefreshLoop()
        refreshLoopTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 50_000_000_000) // 50 seconds
                guard !Task.isCancelled else { break }
                await self?.refreshToken()
            }
        }
    }

    private func stopRefreshLoop() {
        refreshLoopTask?.cancel()
        refreshLoopTask = nil
    }
}
