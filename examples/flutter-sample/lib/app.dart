import 'package:flutter/material.dart';

import 'sample/sample_controller.dart';

/// Two tabs (Sample with its own navigator, About) under a root navigator that shows the license as a modal.
class SampleApp extends StatelessWidget {
  const SampleApp({
    super.key,
    required this.controller,
    required this.tab,
    this.navigatorKey,
    this.navigatorObservers = const [],
    this.sampleNavigatorKey,
    this.sampleNavigatorObservers = const [],
  });

  final SampleController controller;

  /// The selected tab: 0 is Sample, 1 is About.
  final ValueNotifier<int> tab;
  final GlobalKey<NavigatorState>? navigatorKey;
  final List<NavigatorObserver> navigatorObservers;
  final GlobalKey<NavigatorState>? sampleNavigatorKey;
  final List<NavigatorObserver> sampleNavigatorObservers;

  static const detailRoute = '/detail';
  static const licenseRoute = '/license';

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sample',
      navigatorKey: navigatorKey,
      navigatorObservers: navigatorObservers,
      home: HomeScreen(app: this),
      onGenerateRoute: (settings) => switch (settings.name) {
        licenseRoute =>
          MaterialPageRoute(settings: settings, fullscreenDialog: true, builder: (_) => const LicenseScreen()),
        _ => null,
      },
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.app});

  final SampleApp app;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder(
      valueListenable: app.tab,
      builder: (context, index, _) => Scaffold(
        body: IndexedStack(index: index, children: [
          Navigator(
            key: app.sampleNavigatorKey,
            observers: app.sampleNavigatorObservers,
            onGenerateRoute: (settings) => MaterialPageRoute(
              settings: settings,
              builder: (_) => settings.name == SampleApp.detailRoute
                  ? DetailScreen(id: settings.arguments! as String)
                  : SampleScreen(controller: app.controller),
            ),
          ),
          const AboutScreen(),
        ]),
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (i) => app.tab.value = i,
          destinations: const [
            NavigationDestination(icon: Icon(Icons.list), label: 'Sample'),
            NavigationDestination(icon: Icon(Icons.info_outline), label: 'About'),
          ],
        ),
      ),
    );
  }
}

class SampleScreen extends StatelessWidget {
  const SampleScreen({super.key, required this.controller});

  final SampleController controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sample')),
      body: ListenableBuilder(
        listenable: controller,
        builder: (context, _) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(children: [
              IconButton(onPressed: controller.decrement, icon: const Icon(Icons.remove)),
              Text('${controller.count}', style: Theme.of(context).textTheme.headlineMedium),
              IconButton(onPressed: controller.increment, icon: const Icon(Icons.add)),
            ]),
            FilledButton(onPressed: controller.loading ? null : controller.load, child: const Text('Load items')),
            if (controller.error != null) Text('Error: ${controller.error!.message ?? controller.error!.code}'),
            for (final item in controller.items)
              ListTile(
                title: Text(item.title),
                onTap: () => Navigator.of(context).pushNamed(SampleApp.detailRoute, arguments: item.id),
              ),
          ],
        ),
      ),
    );
  }
}

class DetailScreen extends StatelessWidget {
  const DetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context) {
    return Scaffold(appBar: AppBar(title: Text('Item $id')));
  }
}

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('About')),
      body: Center(
        child: FilledButton(
          onPressed: () => Navigator.of(context, rootNavigator: true).pushNamed(SampleApp.licenseRoute),
          child: const Text('Show license'),
        ),
      ),
    );
  }
}

class LicenseScreen extends StatelessWidget {
  const LicenseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('License')),
      body: const Padding(padding: EdgeInsets.all(16), child: Text('MIT License')),
    );
  }
}
