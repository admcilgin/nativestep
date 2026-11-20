import Core
import SwiftUI

/// Reads state and calls send, nothing else (R9). The fields are view state until they are sent.
struct LoginView: View {
    let vm: LoginViewModel
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                SecureField("Password", text: $password)
                if let error = vm.state.error {
                    Text(errorMessage(error)).foregroundStyle(.red)
                }
                Button {
                    vm.send(.signIn(email: email, password: password))
                } label: {
                    if vm.state.loading { ProgressView() } else { Text("Sign in") }
                }
                .disabled(vm.state.loading)
            }
            .navigationTitle("Sign in")
        }
    }
}
