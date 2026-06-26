import SwiftUI

struct SignUpView: View {
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            Color(red: 3/255, green: 7/255, blue: 18/255).ignoresSafeArea()

            ScrollView {
                VStack(spacing: 12) {
                    Text("Create Account")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, 24)
                        .padding(.bottom, 8)

                    AuthField("Name (optional)", text: $name)
                        .textContentType(.name)

                    AuthField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)

                    AuthSecureField(placeholder: "Password (8+ characters)", text: $password)
                        .textContentType(.newPassword)

                    if let msg = errorMessage {
                        Text(msg)
                            .font(.caption)
                            .foregroundColor(Color(red: 252/255, green: 100/255, blue: 100/255))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 4)
                    }

                    EmeraldButton(label: "Create Account", isLoading: isLoading,
                                  disabled: email.isEmpty || password.isEmpty,
                                  action: signUp)
                    .padding(.top, 4)
                }
                .padding(.horizontal, 28)
                .padding(.bottom, 48)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color(red: 3/255, green: 7/255, blue: 18/255), for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    private func signUp() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                let trimmed = name.trimmingCharacters(in: .whitespaces)
                let response = try await APIClient.shared.signUp(
                    name: trimmed.isEmpty ? nil : trimmed,
                    email: email,
                    password: password
                )
                await AuthManager.shared.signIn(token: response.token)
            } catch let e as APIError {
                errorMessage = e.errorDescription
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
