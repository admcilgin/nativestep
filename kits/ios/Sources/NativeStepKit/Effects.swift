/// Work that `update` returns instead of doing itself (R8). Its result goes back to `update` as a message.
public typealias Effect<Message> = @MainActor () async -> Message

/// Runs a ViewModel's effects and reports them to `Effects`, which the protocol's `busy` comes from.
@MainActor
public final class EffectRunner {
    public init() {}

    public func run<Message>(_ effect: @escaping Effect<Message>, _ deliver: @escaping @MainActor (Message) -> Void) {
        Effects.track {
            let message = await effect()
            if !Task.isCancelled { deliver(message) }
        }
    }
}

/// Every in-flight effect in the process. The host reads `inFlight` and cancels everything on a new session.
@MainActor
public enum Effects {
    private static var tasks: [Int: Task<Void, Never>] = [:]
    private static var nextID = 0

    public static var inFlight: Int { tasks.count }

    static func track(_ body: @escaping @MainActor () async -> Void) {
        let id = nextID
        nextID += 1
        tasks[id] = Task { @MainActor in
            await body()
            tasks[id] = nil
        }
    }

    public static func cancelAll() {
        for task in tasks.values { task.cancel() }
        tasks = [:]
    }
}
