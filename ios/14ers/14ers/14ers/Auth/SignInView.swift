import SwiftUI
import WebKit

struct SignInView: View {
    var body: some View {
        ZStack {
            Color(red: 3/255, green: 7/255, blue: 18/255).ignoresSafeArea()

            VStack(spacing: 0) {
                VStack(spacing: 6) {
                    Image(systemName: "mountain.2.fill")
                        .font(.system(size: 40))
                        .foregroundColor(Color(red: 56/255, green: 189/255, blue: 248/255))
                    Text("14ers")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    Text("Track every summit")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                .padding(.top, 48)
                .padding(.bottom, 32)

                ClerkWebView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
}

struct ClerkWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "clerkToken")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.backgroundColor = UIColor(red: 3/255, green: 7/255, blue: 18/255, alpha: 1)
        webView.scrollView.backgroundColor = UIColor(red: 3/255, green: 7/255, blue: 18/255, alpha: 1)
        webView.isOpaque = false
        webView.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

        let url = URL(string: Config.apiBaseURL + "/sign-in")!
        webView.load(URLRequest(url: url))

        Task { @MainActor in
            AuthManager.shared.attachWebView(webView)
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    @MainActor
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
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
            // Once Clerk has redirected away from auth pages, extract the session token
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

