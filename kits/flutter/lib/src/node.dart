/// What a screen or navigator shows over the protocol (PROTOCOL.md §4).
/// The binding maps the reference app's own state into the target's names and shapes.
abstract class StepNode {
  String get name;

  /// JSON-ready state. Leave out `null` values, as the native targets do.
  Map<String, Object?> get state;

  /// Offered only while this node is focused.
  List<StepAction> get actions => const [];

  /// Offered to every node below this one (navigators: `goBack`, `selectTab`, `dismiss`).
  List<StepAction> get lends => const [];

  StepNode? get child => null;
}

class StepAction {
  StepAction(this.name, this.title, this.perform, {this.input});

  final String name;
  final String title;
  final InputSchema? input;

  /// Receives the validated input (an empty map for actions without input).
  final void Function(Map<String, Object?> input) perform;
}

/// The JSON Schema subset of PROTOCOL.md §5.
class InputSchema {
  const InputSchema._(this.type,
      {this.properties, this.required, this.items, this.oneOf, this.minimum, this.maximum, this.minLength, this.maxLength});

  /// `required` defaults to every property.
  const InputSchema.object(Map<String, InputSchema> properties, {List<String>? required})
      : this._('object', properties: properties, required: required);
  const InputSchema.string({int? minLength, int? maxLength, List<String>? oneOf})
      : this._('string', minLength: minLength, maxLength: maxLength, oneOf: oneOf);
  const InputSchema.integer({int? minimum, int? maximum}) : this._('integer', minimum: minimum, maximum: maximum);
  const InputSchema.number({num? minimum, num? maximum}) : this._('number', minimum: minimum, maximum: maximum);
  const InputSchema.boolean() : this._('boolean');
  const InputSchema.array(InputSchema items) : this._('array', items: items);

  final String type;
  final Map<String, InputSchema>? properties;
  final List<String>? required;
  final InputSchema? items;
  final List<String>? oneOf;
  final num? minimum;
  final num? maximum;
  final int? minLength;
  final int? maxLength;

  Map<String, Object?> toJson() => {
        'type': type,
        if (properties != null) 'properties': properties!.map((k, v) => MapEntry(k, v.toJson())),
        if (properties != null) 'required': required ?? (properties!.keys.toList()..sort()),
        if (items != null) 'items': items!.toJson(),
        if (oneOf != null) 'enum': oneOf,
        if (minimum != null) 'minimum': minimum,
        if (maximum != null) 'maximum': maximum,
        if (minLength != null) 'minLength': minLength,
        if (maxLength != null) 'maxLength': maxLength,
      };

  /// Returns `{path, message}` violations; empty when [value] matches.
  List<Map<String, String>> validate(Object? value, [String path = '']) {
    List<Map<String, String>> fail(String message) => [
          {'path': path, 'message': message}
        ];
    switch (type) {
      case 'object':
        if (value is! Map) return fail('must be of type object');
        final keys = properties!.keys.toList()..sort();
        return [
          for (final key in keys)
            if (value.containsKey(key))
              ...properties![key]!.validate(value[key], '$path/$key')
            else if ((required ?? keys).contains(key))
              {'path': '$path/$key', 'message': 'is required'}
        ];
      case 'string':
        if (value is! String) return fail('must be of type string');
        final length = value.runes.length;
        if (minLength != null && length < minLength!) return fail('must have at least $minLength characters');
        if (maxLength != null && length > maxLength!) return fail('must have at most $maxLength characters');
        if (oneOf != null && !oneOf!.contains(value)) return fail('must be one of ${oneOf!.join(', ')}');
        return const [];
      case 'integer':
      case 'number':
        if (type == 'integer' ? value is! int : value is! num) return fail('must be of type $type');
        final n = value as num;
        if (minimum != null && n < minimum!) return fail('must be ≥ $minimum');
        if (maximum != null && n > maximum!) return fail('must be ≤ $maximum');
        return const [];
      case 'boolean':
        return value is bool ? const [] : fail('must be of type boolean');
      case 'array':
        if (value is! List) return fail('must be of type array');
        return [for (var i = 0; i < value.length; i++) ...items!.validate(value[i], '$path/$i')];
    }
    return fail('unknown schema type $type');
  }
}
