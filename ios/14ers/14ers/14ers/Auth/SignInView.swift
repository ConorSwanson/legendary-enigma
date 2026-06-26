import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showSignUp = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 3/255, green: 7/255, blue: 18/255).ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 0) {
                        VStack(spacing: 8) {
                            Image(systemName: "mountain.2.fill")
                                .font(.system(size: 52))
                                .foregroundColor(Color(red: 52/255, green: 211/255, blue: 153/255))
                            Text("14ers")
                                .font(.system(size: 40, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            Text("Track every summit")
                                .foregroundColor(Color(white: 0.5))
                                .font(.subheadline)
                        }
                        .padding(.top, 72)
                        .padding(.bottom, 48)

                        VStack(spacing: 12) {
                            SignInWithAppleButton(.signIn,
                                onRequest: { req in req.requestedScopes = [.fullName, .email] },
                                onCompletion: handleAppleResult
                            )
                            .signInWithAppleButtonStyle(.white)
                            .frame(height: 52)
                            .cornerRadius(14)

                            HStack {
                                Rectangle().fill(Color.white.opacity(0.12)).frame(height: 1)
                                Text("or").foregroundColor(Color(white: 0.4)).font(.footnote)
                                Rectangle().fill(Color.white.opacity(0.12)).frame(height: 1)
                            }
                            .padding(.vertical, 4)

                            AuthField("Email", text: $email)
                                .keyboardType(.emailAddress)
                                .textContentType(.emailAddress)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)

                            AuthSecureField(placeholder: "Password", text: $password)
                                .textContentType(.password)

                            if let msg = errorMessage {
                                Text(msg)
                                    .font(.caption)
                                    .foregroundColor(Color(red: 252/255, green: 100/255, blue: 100/255))
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 4)
                            }

                            EmeraldButton(label: "Sign In", isLoading: isLoading,
                                          disabled: email.isEmpty || password.isEmpty,
                                          action: signIn)

                            Button {
                                showSignUp = true
                            } label: {
                                Text("Create an account")
                                    .font(.subheadline)
                                    .foregroundColor(Color(red: 52/255, green: 211/255, blue: 153/255))
                            }
                            .padding(.top, 4)
                        }
                        .padding(.horizontal, 28)
                        .padding(.bottom, 48)
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
            .tint(Color(red: 52/255, green: 211/255, blue: 153/255))
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
            .tint(Color(red: 52/255, green: 211/255, blue: 153/255))
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

struct EmeraldButton: View {
    let label: String
    let isLoading: Bool
    let disabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color(red: 52/255, green: 211/255, blue: 153/255))
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
