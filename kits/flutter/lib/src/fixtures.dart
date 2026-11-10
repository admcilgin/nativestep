import 'server.dart' show ProtocolError;

/// A fixture `error` entry, thrown from [FixtureStore.call]. The binding turns it into the app's own error type.
class FixtureError implements Exception {
  FixtureError(this.code, [this.message]);

  final String code;
  final String? message;

  @override
  String toString() => 'FixtureError($code${message == null ? '' : ': $message'})';
}

class _Entry {
  _Entry(this.args, this.result, this.error, this.delayMs, this.remaining);

  final Map<String, Object?>? args;
  final Object? result;
  final FixtureError? error;
  final int delayMs;
  int? remaining;
}

/// Answers service calls from the session's fixture document (PROTOCOL.md §7).
/// The binding's fixture repositories call [call] with the *target* service names.
class FixtureStore {
  FixtureStore(Map<String, Object?> document, this._poison) {
    final services = document['services'] ?? const {};
    if (services is! Map) throw ProtocolError('bad_request', 'fixtures.services must be an object');
    for (final MapEntry(key: service, value: methods) in services.entries) {
      if (methods is! Map) throw ProtocolError('bad_request', 'fixtures.services.$service must be an object');
      for (final MapEntry(key: method, value: entries) in methods.entries) {
        if (entries is! List) throw ProtocolError('bad_request', 'fixtures for $service.$method must be a list');
        _entries['$service.$method'] = [
          for (final e in entries.cast<Map>())
            if ((e['result'] == null) == (e['error'] == null))
              throw ProtocolError('bad_request', 'a fixture for $service.$method needs exactly one of result and error')
            else
              _Entry(
                (e['args'] as Map?)?.cast<String, Object?>(),
                e['result'],
                e['error'] == null ? null : FixtureError(e['error']['code'] as String, e['error']['message'] as String?),
                (e['delayMs'] as int?) ?? 0,
                e['times'] as int?,
              )
        ];
      }
    }
    flags = ((document['flags'] as Map?) ?? const {}).cast<String, Object?>();
  }

  final void Function(ProtocolError) _poison;
  final _entries = <String, List<_Entry>>{};
  late final Map<String, Object?> flags;
  int _inFlight = 0;

  /// Whether a fixture call is in flight. In the reference app these calls are the effects (`busy`).
  bool get busy => _inFlight > 0;

  /// Returns the JSON `result` of the first matching entry, or throws its [FixtureError].
  Future<Object?> call(String service, String method, [Map<String, Object?> args = const {}]) async {
    _inFlight++;
    try {
      final entry = _entries['$service.$method']
          ?.where((e) => e.remaining != 0 && (e.args ?? const {}).entries.every((a) => _equal(args[a.key], a.value)))
          .firstOrNull;
      if (entry == null) {
        _poison(ProtocolError('fixture_missing', 'no fixture for $service.$method',
            {'service': service, 'method': method, 'args': args}));
        throw FixtureError('fixture_missing');
      }
      if (entry.remaining != null) entry.remaining = entry.remaining! - 1;
      if (entry.delayMs > 0) await Future<void>.delayed(Duration(milliseconds: entry.delayMs));
      if (entry.error != null) throw entry.error!;
      return entry.result;
    } finally {
      _inFlight--;
    }
  }
}

bool _equal(Object? a, Object? b) {
  if (a is Map && b is Map) {
    return a.length == b.length && a.keys.every((k) => b.containsKey(k) && _equal(a[k], b[k]));
  }
  if (a is List && b is List) {
    return a.length == b.length && Iterable.generate(a.length).every((i) => _equal(a[i], b[i]));
  }
  return a == b;
}
