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
    func makeUIView(context: Context) -> WKWebView {
        AuthManager.shared.webView
    }
    func updateUIView(_ webView: WKWebView, context: Context) {}
}

