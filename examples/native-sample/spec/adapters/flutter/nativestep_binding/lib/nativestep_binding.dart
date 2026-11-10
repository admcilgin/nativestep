/// Binds the Sample Flutter app to nativestep (COMPONENTS.md §5). Written for this project only:
/// it knows the app's controller, repository and routes, and publishes them under the target's names.
///
/// Name mapping (would live in spec/profile.md):
///   SampleRepository.fetchItems(page)  →  SampleService.list(page)
///   SampleException(code, message)     →  error { code, message }
///   root navigator '/license' → Modal › License
///   tab index 0 → Tabs › Stack (the Sample tab's navigator), 1 → Tabs › About
///   Sample tab route '/' → Sample, '/detail' → SampleDetail
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_sample/app.dart';
import 'package:flutter_sample/sample/sample_controller.dart';
import 'package:flutter_sample/sample/sample_repository.dart';
import 'package:nativestep_adapter/nativestep_adapter.dart';

/// Called from the app's `main` in debug builds with `--dart-define=NATIVESTEP=true`.
void startNativeStep() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Center(child: Text('Waiting for nativestep…', textDirection: TextDirection.ltr)));
  StepServer(app: 'Sample', start: _start, settle: _settle).listen();
}

/// Lets the UI catch up; frames can be throttled while the window is hidden, so never wait long.
Future<void> _settle() =>
    WidgetsBinding.instance.endOfFrame.timeout(const Duration(milliseconds: 200), onTimeout: () {});

Future<StepNode> _start(FixtureStore fixtures, String? route) async {
  final session = _Session(SampleController(_FixtureSampleRepository(fixtures)));
  runApp(SampleApp(
    key: UniqueKey(),
    controller: session.controller,
    tab: session.tab,
    navigatorKey: session.navigator,
    navigatorObservers: [session.routes],
    sampleNavigatorKey: session.sampleNavigator,
    sampleNavigatorObservers: [session.sampleRoutes],
  ));
  await _settle();
  if (route != null) {
    final uri = Uri.parse(route);
    final parts = [uri.host, ...uri.pathSegments].where((p) => p.isNotEmpty).toList();
    if (parts.length == 2 && parts[0] == 'detail') {
      session.sampleNavigator.currentState!.pushNamed(SampleApp.detailRoute, arguments: parts[1]);
    } else if (parts.length == 1 && parts[0] == 'license') {
      session.tab.value = 1;
      session.navigator.currentState!.pushNamed(SampleApp.licenseRoute);
    } else if (parts.isNotEmpty) {
      throw ProtocolError('bad_request', 'no screen for route $route');
    }
  }
  return _AppNode(session);
}

class _FixtureSampleRepository implements SampleRepository {
  _FixtureSampleRepository(this.fixtures);

  final FixtureStore fixtures;

  @override
  Future<List<Item>> fetchItems(int page) async {
    try {
      final result = await fixtures.call('SampleService', 'list', {'page': page}) as Map;
      return [for (final i in result['items'] as List) Item(i['id'] as String, i['title'] as String)];
    } on FixtureError catch (e) {
      throw SampleException(e.code, e.message);
    }
  }
}

class _Session {
  _Session(this.controller);

  final SampleController controller;
  final tab = ValueNotifier(0);
  final navigator = GlobalKey<NavigatorState>();
  final routes = _RouteStack();
  final sampleNavigator = GlobalKey<NavigatorState>();
  final sampleRoutes = _RouteStack();
}

/// Mirrors the Navigator's route stack, so focus follows navigation immediately.
class _RouteStack extends NavigatorObserver {
  final stack = <Route<dynamic>>[];

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) => stack.add(route);
  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) => stack.remove(route);
  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) => stack.remove(route);
  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    final i = stack.indexOf(oldRoute!);
    if (i >= 0 && newRoute != null) stack[i] = newRoute;
  }
}

class _AppNode extends StepNode {
  _AppNode(this.session);

  final _Session session;

  @override
  String get name => 'App';
  @override
  Map<String, Object?> get state => const {};
  @override
  StepNode get child => _ModalNode(session);
}

/// The root navigator: anything above its home route is a modal.
class _ModalNode extends StepNode {
  _ModalNode(this.session);

  final _Session session;
  bool get _presented => session.routes.stack.length > 1;

  @override
  String get name => 'Modal';
  @override
  Map<String, Object?> get state => {'presented': _presented};
  @override
  List<StepAction> get lends => [
        if (_presented) StepAction('dismiss', 'Dismiss', (_) => session.navigator.currentState!.pop()),
      ];
  @override
  StepNode get child => _presented ? _LicenseNode() : _TabsNode(session);
}

class _TabsNode extends StepNode {
  _TabsNode(this.session);

  final _Session session;
  static const _ids = ['sample', 'about'];

  @override
  String get name => 'Tabs';
  @override
  Map<String, Object?> get state => {'selected': _ids[session.tab.value]};
  @override
  List<StepAction> get lends => [
        StepAction('selectTab', 'Select tab', (input) => session.tab.value = _ids.indexOf(input['tab']! as String),
            input: const InputSchema.object({'tab': InputSchema.string(oneOf: _ids)})),
      ];
  @override
  StepNode get child => session.tab.value == 0 ? _StackNode(session) : _AboutNode(session);
}

class _StackNode extends StepNode {
  _StackNode(this.session);

  final _Session session;
  List<Route<dynamic>> get _routes => session.sampleRoutes.stack;

  @override
  String get name => 'Stack';
  @override
  Map<String, Object?> get state => {'depth': _routes.length};
  @override
  List<StepAction> get lends => [
        if (_routes.length > 1) StepAction('goBack', 'Back', (_) => session.sampleNavigator.currentState!.pop()),
      ];
  @override
  StepNode? get child {
    if (_routes.isEmpty) return null;
    final settings = _routes.last.settings;
    return settings.name == SampleApp.detailRoute
        ? _SampleDetailNode(settings.arguments! as String)
        : _SampleNode(session);
  }
}

class _SampleNode extends StepNode {
  _SampleNode(this.session);

  final _Session session;
  SampleController get c => session.controller;

  @override
  String get name => 'Sample';

  @override
  Map<String, Object?> get state => {
        'count': c.count,
        'items': [
          for (final i in c.items) {'id': i.id, 'title': i.title}
        ],
        'loading': c.loading,
        if (c.error != null) 'error': {'code': c.error!.code, if (c.error!.message != null) 'message': c.error!.message},
      };

  @override
  List<StepAction> get actions => [
        StepAction('increment', 'Increment', (_) => c.increment()),
        StepAction('decrement', 'Decrement', (_) => c.decrement()),
        StepAction('set', 'Set count', (input) => c.setCount(input['value']! as int),
            input: const InputSchema.object({'value': InputSchema.integer(minimum: 0)})),
        StepAction('load', 'Load items', (_) => c.load()),
        // The app opens details from a list tile tap; the binding performs the same navigation.
        StepAction('openDetail', 'Open item',
            (input) => session.sampleNavigator.currentState!.pushNamed(SampleApp.detailRoute, arguments: input['id']),
            input: const InputSchema.object({'id': InputSchema.string(minLength: 1)})),
        StepAction('_probeNetwork', 'Probe the network guard', (_) => c.probeNetwork()),
      ];

}

class _SampleDetailNode extends StepNode {
  _SampleDetailNode(this.id);

  final String id;

  @override
  String get name => 'SampleDetail';
  @override
  Map<String, Object?> get state => {'id': id};
}

class _AboutNode extends StepNode {
  _AboutNode(this.session);

  final _Session session;

  @override
  String get name => 'About';
  @override
  Map<String, Object?> get state => const {};
  @override
  List<StepAction> get actions => [
        // The app's button pushes the license on the root navigator; the binding does the same.
        StepAction('openLicense', 'Show license',
            (_) => session.navigator.currentState!.pushNamed(SampleApp.licenseRoute)),
      ];
}

class _LicenseNode extends StepNode {
  @override
  String get name => 'License';
  @override
  Map<String, Object?> get state => const {};
}
