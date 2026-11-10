import Foundation
import NativeStepKit
import Observation

/// The conformance screen. Every target implements the same behavior (COMPONENTS.md §6).
@MainActor @Observable
public final class SampleViewModel {
    public struct State: Codable, Equatable, Sendable {
        public var count = 0
        public var items: [SampleItem] = []
        public var loading = false
        public var error: AppError?
    }

    public enum Action: Equatable, Sendable {
        case increment
        case decrement
        case set(Int)
        case load
        case openDetail(id: String)
        case probeNetwork
    }

    enum Message: Sendable {
        case action(Action)
        case loaded(Result<SampleList, AppError>)
        case probed
    }

    public private(set) var state = State()
    @ObservationIgnored let effects = EffectRunner()
    private let sample: any SampleService
    private unowned let router: any Router

    public init(sample: any SampleService, router: any Router) {
        self.sample = sample
        self.router = router
    }

    public func send(_ action: Action) { handle(.action(action)) }

    private func handle(_ message: Message) {
        for effect in update(message) {
            effects.run(effect) { [weak self] in self?.handle($0) }
        }
    }

    /// State changes only here (R8).
    private func update(_ message: Message) -> [Effect<Message>] {
        switch message {
        case .action(.increment):
            state.count += 1
            return []
        case .action(.decrement):
            if state.count > 0 { state.count -= 1 }
            return []
        case .action(.set(let value)):
            state.count = value
            return []
        case .action(.load):
            guard !state.loading else { return [] }
            state.loading = true
            state.error = nil
            return [{ [sample] in .loaded(await sample.list(page: 1)) }]
        case .action(.openDetail(let id)):
            router.go(.sampleDetail(id: id))
            return []
        case .action(.probeNetwork):
            // Breaks R4 on purpose: a raw request that only the host's network guard can stop.
            return [{
                _ = try? await URLSession.shared.data(from: URL(string: "https://example.com/")!)
                return .probed
            }]
        case .loaded(.success(let list)):
            state.loading = false
            state.items = list.items
            return []
        case .loaded(.failure(let error)):
            state.loading = false
            state.error = error
            return []
        case .probed:
            return []
        }
    }
}
