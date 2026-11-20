# Binding shape

The binding is a Dart package at `spec/adapters/flutter/nativestep_binding/`. Only the parts marked `<…>` depend on the project; how they are filled comes from `spec/profile.md`.

```yaml
# pubspec.yaml
name: nativestep_binding
description: Binds <App> to nativestep. Written for this project only (COMPONENTS.md §5).
publish_to: none

environment:
  sdk: <the Flutter app's constraint>

dependencies:
  flutter:
    sdk: flutter
  nativestep_adapter:
    path: ../../../../kits/flutter
  <flutter app package name>:
    path: <relative path to the Flutter app>
  # Every package the binding imports, with the app's constraint.
```

```dart
// lib/nativestep_binding.dart
/// Binds <App> to nativestep (COMPONENTS.md §5). The name mapping is in spec/profile.md.
library;

import 'package:flutter/widgets.dart';
import 'package:nativestep_adapter/nativestep_adapter.dart';

/// Called from the app's main in debug builds with --dart-define=NATIVESTEP=true.
void startNativeStep() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Center(child: Text('Waiting for nativestep…', textDirection: TextDirection.ltr)));
  final server = StepServer(app: '<App>', start: _start, settle: _settle);
  // The port belongs to the visible app; a hidden one lets another project's reference app take it.
  AppLifecycleListener(onHide: server.close, onShow: server.listen);
  server.listen();
}

/// Lets the UI catch up; frames can be throttled while the simulator window is hidden, so never wait long.
Future<void> _settle() =>
    WidgetsBinding.instance.endOfFrame.timeout(const Duration(milliseconds: 200), onTimeout: () {});

Future<StepNode> _start(FixtureStore fixtures, String? route) async {
  // 1. Build the app from scratch with fixture services at the injection point, under a new key.
  // 2. await _settle();
  // 3. Open `route` with the app's own navigation; an unknown route throws ProtocolError('bad_request', …).
  // 4. Return the root node, which reads everything live: never cache state in a node.
}

/// One per service in the profile's service table.
class _<Source>Fixture implements <Source> {
  _<Source>Fixture(this.fixtures);

  final FixtureStore fixtures;

  @override
  Future<<SourceModel>> <sourceMethod>(<source parameters>) async {
    try {
      final json = await fixtures.call('<TargetService>', '<targetMethod>', {'<targetParam>': <value>});
      return <SourceModel from json>;
    } on FixtureError catch (e) {
      throw <the source error for e.code, as the profile maps it>;
    }
  }
}

class _AppNode extends StepNode {
  @override
  String get name => 'App';
  @override
  Map<String, Object?> get state => const {};
  @override
  StepNode get child => <the top navigator node>;
}

/// A screen: state in target names and shapes, actions doing what the widgets do.
class _<Screen>Node extends StepNode {
  @override
  String get name => '<Screen>';
  @override
  Map<String, Object?> get state => {
        '<field>': <value read from the app's state>,
        if (<error> != null) 'error': {'code': <code>},
      };
  @override
  List<StepAction> get actions => [
        StepAction('<action>', '<Title>', (input) => <the call the widget makes>,
            input: const InputSchema.object({'<param>': InputSchema.string(minLength: 1)})),
      ];
}
```

Navigator nodes follow PROTOCOL.md §4: `Modal` has `{ presented }` and lends `dismiss` while something is presented; `Tabs` has `{ selected }` and lends `selectTab` with an `enum` of tab ids; `Stack` has `{ depth }` and lends `goBack` above its root. Each one's `child` is the branch on screen.

When the app does not expose a navigator's stack, a `NavigatorObserver` can mirror it, but only if the app lets the binding pass one in at start-up; otherwise read it from the router's own state or from the state that opens the route (a dialog shown while a state value is set, for example).

## State kept inside widgets

When a screen's state lives in a library-private `State` (a `StatefulWidget` with `setState`), nothing outside the widget tree holds it, but the element tree still shows it. Read and drive the screen there before calling it `read-only`:

```dart
/// Every widget on screen, parents first.
Iterable<Widget> _widgets() sync* {
  final root = WidgetsBinding.instance.rootElement;
  if (root == null) return;
  final stack = <Element>[root];
  while (stack.isNotEmpty) {
    final element = stack.removeLast();
    yield element.widget;
    element.visitChildElements(stack.add);
  }
}

// state: what the screen shows, read from public widget fields
'count': _widgets().whereType<Text>().map((t) => int.tryParse(t.data ?? '')).whereType<int>().single,
// action: the callback a tap calls
StepAction('increment', 'Increment', (_) => _widgets().whereType<FloatingActionButton>().single.onPressed!()),
```

- Find widgets by public types and fields: `Text.data`, `TextField.controller`, `Switch.value`, `onPressed`, `onChanged`. A `Key` the app already sets narrows the search; never add one to the app.
- Each lookup must match exactly one widget (`single`), so a layout change fails loudly instead of reading the wrong value.
- A new key on the app's root widget (`MyApp(key: UniqueKey())`) gives fresh `State` objects for each session.
- Write in the profile which widget each field and action comes from. If the value is not on screen in a form the binding can read, the screen is `read-only`.

