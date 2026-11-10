import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'fixtures.dart';
import 'node.dart';

/// A protocol error response (PROTOCOL.md §8). [extra] fields go next to `code` and `message`.
class ProtocolError implements Exception {
  ProtocolError(this.code, this.message, [this.extra = const {}]);

  final String code;
  final String message;
  final Map<String, Object?> extra;

  Map<String, Object?> toJson() => {...extra, 'code': code, 'message': message};

  @override
  String toString() => 'ProtocolError($code: $message)';
}

/// Builds the app from fixture-backed services, opens [route] if given, and returns the root node.
typedef StartSession = Future<StepNode> Function(FixtureStore fixtures, String? route);

/// The protocol server for the reference app (device target, TCP; PROTOCOL.md §1).
class StepServer {
  StepServer({required this.app, required this.start, this.settle});

  static const protocolVersion = 1;

  final String app;
  final StartSession start;

  /// Lets the app catch up after an action, for example `WidgetsBinding.instance.endOfFrame`.
  final Future<void> Function()? settle;

  StepNode? _root;
  FixtureStore? _fixtures;
  ProtocolError? _poisoned;

  Future<void> listen({int port = 7357}) async {
    HttpOverrides.global = _NetworkGuard(this);
    final server = await ServerSocket.bind(InternetAddress.loopbackIPv4, port);
    stderr.writeln('nativestep: listening on 127.0.0.1:$port');
    await for (final socket in server) {
      await _serve(socket);
    }
  }

  Future<void> _serve(Socket socket) async {
    try {
      // Requests are handled one at a time, in order (PROTOCOL.md §1).
      await for (final line in utf8.decoder.bind(socket).transform(const LineSplitter())) {
        socket.write('${jsonEncode(await respond(line))}\n');
      }
    } catch (e) {
      stderr.writeln('nativestep: connection closed: $e');
    } finally {
      await socket.close();
    }
  }

  Future<Map<String, Object?>> respond(String line) async {
    Object? id;
    try {
      final request = _decode(line);
      id = request['id'];
      final cmd = request['cmd'];
      if (cmd is! String) throw ProtocolError('bad_request', 'missing cmd');
      return {...await _handle(cmd, request), 'id': id, 'ok': true};
    } on ProtocolError catch (e) {
      return {'id': id, 'ok': false, 'error': e.toJson()};
    } catch (e) {
      return {
        'id': id,
        'ok': false,
        'error': ProtocolError('internal', 'unexpected error', {'detail': '$e'}).toJson(),
      };
    }
  }

  Map<String, Object?> _decode(String line) {
    try {
      return (jsonDecode(line) as Map).cast<String, Object?>();
    } catch (_) {
      throw ProtocolError('bad_request', 'the line is not a JSON object');
    }
  }

  Future<Map<String, Object?>> _handle(String cmd, Map<String, Object?> request) async {
    switch (cmd) {
      case 'hello':
        if (request['protocol'] != protocolVersion) {
          throw ProtocolError('protocol_mismatch', 'this host speaks protocol $protocolVersion', {
            'supported': [protocolVersion]
          });
        }
        return {
          'protocol': protocolVersion,
          'target': 'flutter',
          'app': app,
          'capabilities': ['start'],
        };
      case 'start':
        _stop();
        final document = request['fixtures'] ?? const <String, Object?>{};
        if (document is! Map) throw ProtocolError('bad_request', 'fixtures must be an object');
        final fixtures = FixtureStore(document.cast<String, Object?>(), (e) => _poisoned ??= e);
        _fixtures = fixtures;
        _root = await start(fixtures, request['route'] as String?);
        await settle?.call();
        return _snapshot();
      case 'ls':
        return _snapshot();
      case 'do':
        _checkSession();
        final name = request['action'];
        if (name is! String) throw ProtocolError('bad_request', 'missing action');
        final actions = _focus().actions;
        final action = actions.where((a) => a.$1.name == name).firstOrNull?.$1;
        if (action == null) {
          throw ProtocolError('action_unavailable', '$name is not available here', {
            'available': [for (final a in actions) a.$1.name]
          });
        }
        final input = request['input'] ?? const <String, Object?>{};
        final violations = action.input?.validate(input) ?? const [];
        if (violations.isNotEmpty) {
          throw ProtocolError('invalid_input', 'input for $name does not match its schema', {'errors': violations});
        }
        action.perform((input as Map).cast<String, Object?>());
        await settle?.call();
        return _snapshot();
      case 'stop':
        _stop();
        return {};
      default:
        throw ProtocolError('unknown_command', 'unknown command $cmd', {
          'commands': ['hello', 'start', 'ls', 'do', 'stop']
        });
    }
  }

  void _stop() {
    _root = null;
    _fixtures = null;
    _poisoned = null;
    _blocked = null;
  }

  void _checkSession() {
    if (_root == null) throw ProtocolError('no_session', 'send start first');
    if (_poisoned == null && _blocked != null) {
      _poisoned = ProtocolError('network_blocked', 'a network request was attempted during the session', {
        'request': {'url': _blocked}
      });
    }
    if (_poisoned != null) throw _poisoned!;
  }

  /// The chain from the root to the focused node, and the focused node's actions:
  /// its own first, then those lent by the nodes above it, nearest first (PROTOCOL.md §4).
  ({List<StepNode> path, List<(StepAction, String?)> actions}) _focus() {
    final path = <StepNode>[_root!];
    for (var c = _root!.child; c != null; c = c.child) {
      path.add(c);
    }
    final actions = [for (final a in path.last.actions) (a, null as String?)];
    for (final ancestor in path.reversed.skip(1)) {
      for (final a in ancestor.lends) {
        if (!actions.any((x) => x.$1.name == a.name)) actions.add((a, ancestor.name));
      }
    }
    return (path: path, actions: actions);
  }

  Map<String, Object?> _snapshot() {
    _checkSession();
    final (:path, :actions) = _focus();
    return {
      'node': {
        'name': path.last.name,
        'state': path.last.state,
        'actions': [
          for (final (a, lentBy) in actions)
            {
              'name': a.name,
              'title': a.title,
              if (a.input != null) 'input': a.input!.toJson(),
              if (lentBy != null) 'lentBy': lentBy,
            }
        ],
      },
      'path': [for (final n in path) n.name],
      'busy': _fixtures?.busy ?? false,
    };
  }

  String? _blocked;
}

/// Blocks real network requests while a session is running (R19, PROTOCOL.md §6): every HttpClient the app
/// creates is pointed at a closed local proxy, and the first URL is recorded.
/// shortcut: covers dart:io HttpClient (and packages built on it, such as http and dio); raw sockets get through.
class _NetworkGuard extends HttpOverrides {
  _NetworkGuard(this.server);

  final StepServer server;

  @override
  HttpClient createHttpClient(SecurityContext? context) => super.createHttpClient(context)
    ..findProxy = (uri) {
      if (server._root == null) return 'DIRECT'; // no session: a debug app used by hand
      server._blocked ??= uri.toString();
      return 'PROXY 127.0.0.1:9';
    };
}
