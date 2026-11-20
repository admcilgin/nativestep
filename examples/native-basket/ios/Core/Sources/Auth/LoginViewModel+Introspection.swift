import NativeStepKit

extension LoginViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "Login", state: state, actions: state.loading ? [] : [
            NodeAction("signIn", title: "Sign in", input: SignInInput.self) { [weak self] in
                self?.send(.signIn(email: $0.email, password: $0.password))
            },
        ])
    }
}

struct SignInInput: NodeInput {
    var email: String
    var password: String
    static let schema: InputSchema = .object(["email": .string(), "password": .string()])
}
