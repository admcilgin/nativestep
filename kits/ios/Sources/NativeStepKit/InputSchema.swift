/// The JSON Schema subset of PROTOCOL.md §5. Input is checked against it before it reaches a ViewModel (R13).
public indirect enum InputSchema: Sendable {
    /// `required` defaults to every property.
    case object([String: InputSchema], required: [String]? = nil)
    case string(minLength: Int? = nil, maxLength: Int? = nil, oneOf: [String]? = nil)
    case integer(minimum: Int? = nil, maximum: Int? = nil)
    case number(minimum: Double? = nil, maximum: Double? = nil)
    case boolean
    case array(of: InputSchema)

    public var json: JSONValue {
        func put(_ o: inout [String: JSONValue], _ key: String, _ value: JSONValue?) { if let value { o[key] = value } }
        var o: [String: JSONValue] = ["type": .string(typeName)]
        switch self {
        case .object(let properties, let required):
            o["properties"] = .object(properties.mapValues(\.json))
            o["required"] = .array((required ?? properties.keys.sorted()).map(JSONValue.string))
        case .string(let minLength, let maxLength, let oneOf):
            put(&o, "minLength", minLength.map(JSONValue.int))
            put(&o, "maxLength", maxLength.map(JSONValue.int))
            put(&o, "enum", oneOf.map { .array($0.map(JSONValue.string)) })
        case .integer(let minimum, let maximum):
            put(&o, "minimum", minimum.map(JSONValue.int))
            put(&o, "maximum", maximum.map(JSONValue.int))
        case .number(let minimum, let maximum):
            put(&o, "minimum", minimum.map(JSONValue.double))
            put(&o, "maximum", maximum.map(JSONValue.double))
        case .boolean:
            break
        case .array(let items):
            o["items"] = items.json
        }
        return .object(o)
    }

    public struct Violation: Sendable, Equatable {
        public let path: String
        public let message: String
    }

    public func validate(_ value: JSONValue, at path: String = "") -> [Violation] {
        func fail(_ message: String) -> [Violation] { [Violation(path: path, message: message)] }
        switch (self, value) {
        case (.object(let properties, let required), .object(let fields)):
            return properties.keys.sorted().flatMap { key -> [Violation] in
                let at = "\(path)/\(key)"
                guard let field = fields[key] else {
                    return (required ?? Array(properties.keys)).contains(key) ? [Violation(path: at, message: "is required")] : []
                }
                return properties[key]!.validate(field, at: at)
            }
        case (.string(let minLength, let maxLength, let oneOf), .string(let s)):
            if let minLength, s.count < minLength { return fail("must have at least \(minLength) characters") }
            if let maxLength, s.count > maxLength { return fail("must have at most \(maxLength) characters") }
            if let oneOf, !oneOf.contains(s) { return fail("must be one of \(oneOf.joined(separator: ", "))") }
            return []
        case (.integer(let minimum, let maximum), .int(let n)):
            if let minimum, n < minimum { return fail("must be ≥ \(minimum)") }
            if let maximum, n > maximum { return fail("must be ≤ \(maximum)") }
            return []
        case (.number(let minimum, let maximum), .int(_)), (.number(let minimum, let maximum), .double(_)):
            let n: Double = if case .int(let i) = value { Double(i) } else if case .double(let d) = value { d } else { 0 }
            if let minimum, n < minimum { return fail("must be ≥ \(minimum)") }
            if let maximum, n > maximum { return fail("must be ≤ \(maximum)") }
            return []
        case (.boolean, .bool):
            return []
        case (.array(let items), .array(let elements)):
            return elements.enumerated().flatMap { items.validate($1, at: "\(path)/\($0)") }
        default:
            return fail("must be of type \(typeName)")
        }
    }

    var typeName: String {
        switch self {
        case .object: "object"
        case .string: "string"
        case .integer: "integer"
        case .number: "number"
        case .boolean: "boolean"
        case .array: "array"
        }
    }
}
