import SwiftUI
import AuthenticationServices

private let bgColor   = Color(red: 3/255,  green: 7/255,   blue: 18/255)
private let skyColor  = Color(red: 56/255, green: 189/255, blue: 248/255)
private let midBlue   = Color(red: 8/255,  green: 47/255,  blue: 73/255)
private let deepBlue  = Color(red: 20/255, green: 30/255,  blue: 70/255)
private let farBlue   = Color(red: 30/255, green: 60/255,  blue: 100/255)

struct SignInView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showSignUp = false
    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                // Full-screen mountain scene
                AuthMountainCanvas()
                    .ignoresSafeArea()

                // Gradient that fades mountains into dark bg for the form area
                VStack(spacing: 0) {
                    Color.clear.frame(height: 260)
                    LinearGradient(
                        colors: [bgColor.opacity(0), bgColor],
                        startPoint: .top, endPoint: .bottom
                    )
                    .frame(height: 140)
                    bgColor.ignoresSafeArea(edges: .bottom)
                }
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 0) {
                        // Logo floats over mountain scene
                        VStack(spacing: 14) {
                            Image("SwitchbackLogo")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 220)
                                .shadow(color: skyColor.opacity(0.35), radius: 16, x: 0, y: 4)
                            Text("Track every summit")
                                .foregroundColor(Color(white: 0.55))
                                .font(.subheadline)
                        }
                        .padding(.top, 80)
                        .padding(.bottom, 52)

                        // Auth form
                        VStack(spacing: 12) {
                            SignInWithAppleButton(.signIn,
                                onRequest: { req in req.requestedScopes = [.fullName, .email] },
                                onCompletion: handleAppleResult
                            )
                            .signInWithAppleButtonStyle(.white)
                            .frame(height: 52)
                            .cornerRadius(14)

                            HStack {
                                Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1)
                                Text("or").foregroundColor(Color(white: 0.35)).font(.footnote)
                                Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1)
                            }
                            .padding(.vertical, 2)

                            AuthField("Email", text: $email)
                                .keyboardType(.emailAddress)
                                .textContentType(.emailAddress)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)

                            AuthSecureField(placeholder: "Password", text: $password)
                                .textContentType(.password)

                            HStack {
                                Spacer()
                                Button {
                                    if let url = URL(string: "https://www.getswitchback.co/forgot-password") {
                                        openURL(url)
                                    }
                                } label: {
                                    Text("Forgot password?")
                                        .font(.footnote)
                                        .foregroundColor(Color(white: 0.5))
                                }
                            }

                            if let msg = errorMessage {
                                Text(msg)
                                    .font(.caption)
                                    .foregroundColor(Color(red: 252/255, green: 100/255, blue: 100/255))
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 4)
                            }

                            PrimaryButton(label: "Sign In", isLoading: isLoading,
                                          disabled: email.isEmpty || password.isEmpty,
                                          action: signIn)

                            Button {
                                showSignUp = true
                            } label: {
                                Text("Create an account")
                                    .font(.subheadline)
                                    .foregroundColor(skyColor)
                            }
                            .padding(.top, 4)
                        }
                        .padding(.horizontal, 28)
                        .padding(.bottom, 60)
                    }
                }
            }
            .navigationDestination(isPresented: $showSignUp) {
                SignUpView()
            }
        }
    }

    private func signIn() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                let response = try await APIClient.shared.signIn(email: email, password: password)
                await AuthManager.shared.signIn(token: response.token)
            } catch let e as APIError {
                errorMessage = e.errorDescription
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func handleAppleResult(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let auth):
            guard let cred = auth.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = cred.identityToken,
                  let identityToken = String(data: tokenData, encoding: .utf8) else {
                errorMessage = "Apple sign in failed"
                return
            }
            errorMessage = nil
            isLoading = true
            Task {
                do {
                    let response = try await APIClient.shared.signInWithApple(
                        identityToken: identityToken,
                        fullName: cred.fullName
                    )
                    await AuthManager.shared.signIn(token: response.token)
                } catch let e as APIError {
                    errorMessage = e.errorDescription
                } catch {
                    errorMessage = error.localizedDescription
                }
                isLoading = false
            }
        case .failure(let error):
            if (error as? ASAuthorizationError)?.code != .canceled {
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Mountain Background Canvas

struct AuthMountainCanvas: View {
    var body: some View {
        Canvas { ctx, size in
            // Sky gradient
            ctx.fill(
                Path(CGRect(origin: .zero, size: size)),
                with: .linearGradient(
                    Gradient(stops: [
                        .init(color: Color(red: 5/255,  green: 20/255, blue: 55/255),  location: 0),
                        .init(color: Color(red: 8/255,  green: 47/255, blue: 73/255),  location: 0.45),
                        .init(color: Color(red: 20/255, green: 30/255, blue: 70/255),  location: 0.7),
                        .init(color: Color(red: 3/255,  green: 7/255,  blue: 18/255),  location: 1),
                    ]),
                    startPoint: .zero,
                    endPoint: CGPoint(x: 0, y: size.height)
                )
            )

            // Back range
            var back = Path()
            back.move(to: CGPoint(x: 0, y: size.height))
            back.addLines([
                CGPoint(x: 0,                y: size.height * 0.52),
                CGPoint(x: size.width * 0.12, y: size.height * 0.32),
                CGPoint(x: size.width * 0.28, y: size.height * 0.46),
                CGPoint(x: size.width * 0.42, y: size.height * 0.22),
                CGPoint(x: size.width * 0.55, y: size.height * 0.38),
                CGPoint(x: size.width * 0.68, y: size.height * 0.18),
                CGPoint(x: size.width * 0.80, y: size.height * 0.35),
                CGPoint(x: size.width,         y: size.height * 0.28),
                CGPoint(x: size.width,         y: size.height),
            ])
            back.closeSubpath()
            ctx.fill(back, with: .color(Color(red: 15/255, green: 45/255, blue: 90/255).opacity(0.55)))

            // Mid range
            var mid = Path()
            mid.move(to: CGPoint(x: 0, y: size.height))
            mid.addLines([
                CGPoint(x: 0,                y: size.height * 0.65),
                CGPoint(x: size.width * 0.10, y: size.height * 0.50),
                CGPoint(x: size.width * 0.22, y: size.height * 0.60),
                CGPoint(x: size.width * 0.38, y: size.height * 0.40),
                CGPoint(x: size.width * 0.52, y: size.height * 0.56),
                CGPoint(x: size.width * 0.65, y: size.height * 0.38),
                CGPoint(x: size.width * 0.78, y: size.height * 0.52),
                CGPoint(x: size.width * 0.90, y: size.height * 0.42),
                CGPoint(x: size.width,         y: size.height * 0.55),
                CGPoint(x: size.width,         y: size.height),
            ])
            mid.closeSubpath()
            ctx.fill(mid, with: .color(Color(red: 8/255, green: 28/255, blue: 60/255).opacity(0.75)))

            // Foreground range
            var fore = Path()
            fore.move(to: CGPoint(x: 0, y: size.height))
            fore.addLines([
                CGPoint(x: 0,                y: size.height * 0.78),
                CGPoint(x: size.width * 0.18, y: size.height * 0.62),
                CGPoint(x: size.width * 0.33, y: size.height * 0.72),
                CGPoint(x: size.width * 0.50, y: size.height * 0.55),
                CGPoint(x: size.width * 0.65, y: size.height * 0.68),
                CGPoint(x: size.width * 0.82, y: size.height * 0.58),
                CGPoint(x: size.width,         y: size.height * 0.70),
                CGPoint(x: size.width,         y: size.height),
            ])
            fore.closeSubpath()
            ctx.fill(fore, with: .color(Color(red: 3/255, green: 12/255, blue: 32/255)))
        }
    }
}

// MARK: - Shared auth field components

struct AuthField: View {
    let placeholder: String
    @Binding var text: String

    init(_ placeholder: String, text: Binding<String>) {
        self.placeholder = placeholder
        self._text = text
    }

    var body: some View {
        TextField("", text: $text,
                  prompt: Text(placeholder).foregroundColor(Color(white: 0.35)))
            .padding(.horizontal, 16)
            .frame(height: 52)
            .background(Color.white.opacity(0.07))
            .foregroundColor(.white)
            .tint(Color(red: 56/255, green: 189/255, blue: 248/255))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.12), lineWidth: 1))
    }
}

struct AuthSecureField: View {
    let placeholder: String
    @Binding var text: String
    @State private var isVisible = false

    var body: some View {
        ZStack(alignment: .trailing) {
            Group {
                if isVisible {
                    TextField("", text: $text,
                              prompt: Text(placeholder).foregroundColor(Color(white: 0.35)))
                } else {
                    SecureField("", text: $text,
                                prompt: Text(placeholder).foregroundColor(Color(white: 0.35)))
                }
            }
            .padding(.horizontal, 16)
            .padding(.trailing, 44)
            .frame(height: 52)
            .background(Color.white.opacity(0.07))
            .foregroundColor(.white)
            .tint(Color(red: 56/255, green: 189/255, blue: 248/255))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.12), lineWidth: 1))

            Button {
                isVisible.toggle()
            } label: {
                Image(systemName: isVisible ? "eye.slash" : "eye")
                    .foregroundColor(Color(white: 0.4))
                    .frame(width: 44, height: 52)
            }
        }
    }
}

struct PrimaryButton: View {
    let label: String
    let isLoading: Bool
    let disabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color(red: 56/255, green: 189/255, blue: 248/255))
                    .frame(height: 52)
                if isLoading {
                    ProgressView().tint(Color(red: 2/255, green: 10/255, blue: 24/255))
                } else {
                    Text(label)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Color(red: 2/255, green: 10/255, blue: 24/255))
                }
            }
        }
        .disabled(isLoading || disabled)
        .opacity((isLoading || disabled) ? 0.5 : 1)
    }
}

// Keep EmeraldButton as a typealias so SignUpView compiles unchanged
typealias EmeraldButton = PrimaryButton
