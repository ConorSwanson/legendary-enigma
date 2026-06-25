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

    private override init() {
        super.init()
        checkExistingToken()
    }

    private func checkExistingToken() {
        if KeychainHelper.load(for: "clerk_token") != nil {
            isSignedIn = true
        }
        isLoading = false
    }

    func signOut() {
        APIClient.shared.clearToken()
        webView?.load(URLRequest(url: URL(string: Config.apiBaseURL + "/sign-in")!))
        isSignedIn = false
    }

    /// Called by SignInWebView after successfully extracting the Clerk token
    func didReceiveToken(_ token: String) {
        APIClient.shared.setToken(token)
        isSignedIn = true
    }

    /// Refreshes the token by injecting JS into the maintained web view.
    /// Falls back gracefully — if it fails the next API call will surface a 401.
    func refreshToken() async {
        guard let wv = webView else { return }
        do {
            let token = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<String, Error>) in
                pendingTokenContinuation = cont
                wv.evaluateJavaScript("""
                    window.Clerk?.session?.getToken().then(function(t) {
                        if(t) window.webkit.messageHandlers.clerkToken.postMessage(t);
                    });
                """)
            }
            APIClient.shared.setToken(token)
        } catch {
            // Token refresh failed — will prompt sign-in on next unauthorized response
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
}
