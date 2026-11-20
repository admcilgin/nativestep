/// Binds the Basket Flutter app to nativestep (COMPONENTS.md §5). Written for this project only.
/// The name mapping and the decisions it applies are in spec/profile.md.
library;

import 'package:basket/api.dart';
import 'package:basket/app.dart';
import 'package:basket/auth/auth_controller.dart';
import 'package:basket/auth/auth_repository.dart';
import 'package:basket/basket/basket_controller.dart';
import 'package:basket/basket/order_repository.dart';
import 'package:basket/products/product.dart';
import 'package:basket/products/product_repository.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:nativestep_adapter/nativestep_adapter.dart';

/// Called from the app's `main` in debug builds with `--dart-define=NATIVESTEP=true`.
void startNativeStep() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Center(child: Text('Waiting for nativestep…', textDirection: TextDirection.ltr)));
  final server = StepServer(app: 'Basket', start: _start, settle: _settle);
  // The port belongs to the visible app; a hidden one lets another project's reference app take it.
  AppLifecycleListener(onHide: server.close, onShow: server.listen);
  server.listen();
}

/// Lets the UI catch up; frames can be throttled while the simulator window is hidden, so never wait long.
Future<void> _settle() =>
    WidgetsBinding.instance.endOfFrame.timeout(const Duration(milliseconds: 200), onTimeout: () {});

ProviderContainer? _container;

Future<StepNode> _start(FixtureStore fixtures, String? route) async {
  // The app accepts no deep links (profile: Navigation).
  if (route != null) throw ProtocolError('bad_request', 'Basket has no deep links; got $route');
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(_FixtureAuthRepository(fixtures)),
      productRepositoryProvider.overrideWithValue(_FixtureProductRepository(fixtures)),
      orderRepositoryProvider.overrideWithValue(_FixtureOrderRepository(fixtures)),
    ],
    // Decision (profile: State): the native app does not retry failed loads, so the reference does not either.
    retry: (_, _) => null,
  );
  runApp(UncontrolledProviderScope(key: UniqueKey(), container: container, child: const BasketApp()));
  await _settle();
  _container?.dispose();
  _container = container;
  return _AppNode(container);
}

// Services (profile: Services).

ApiException _apiError(FixtureError e) =>
    ApiException(const {'unauthorized', 'not_found', 'out_of_stock'}.contains(e.code) ? e.code : 'network');

Map<String, dynamic> _object(Object? json) => Map<String, dynamic>.from(json! as Map);

class _FixtureAuthRepository implements AuthRepository {
  _FixtureAuthRepository(this.fixtures);

  final FixtureStore fixtures;

  @override
  Future<User> login({required String email, required String password}) async {
    try {
      return User.fromJson(_object(await fixtures.call('AuthService', 'signIn', {'email': email, 'password': password})));
    } on FixtureError catch (e) {
      throw _apiError(e);
    }
  }
}

class _FixtureProductRepository implements ProductRepository {
  _FixtureProductRepository(this.fixtures);

  final FixtureStore fixtures;

  @override
  Future<List<Product>> fetchProducts() async {
    try {
      return [for (final p in await fixtures.call('ProductService', 'list') as List) Product.fromJson(_object(p))];
    } on FixtureError catch (e) {
      throw _apiError(e);
    }
  }

  @override
  Future<Product> fetchProduct(String id) async {
    try {
      return Product.fromJson(_object(await fixtures.call('ProductService', 'detail', {'id': id})));
    } on FixtureError catch (e) {
      throw _apiError(e);
    }
  }
}

class _FixtureOrderRepository implements OrderRepository {
  _FixtureOrderRepository(this.fixtures);

  final FixtureStore fixtures;

  @override
  Future<String> placeOrder(List<BasketLine> lines) async {
    try {
      final result = await fixtures.call('OrderService', 'place', {
        'items': [
          for (final l in lines) {'productId': l.product.id, 'quantity': l.quantity},
        ],
      });
      return _object(result)['id'] as String;
    } on FixtureError catch (e) {
      throw _apiError(e);
    }
  }
}

// Nodes (profile: Node tree). They read the providers live and act through the calls the widgets make.

Map<String, Object?> _error(Object e) => {'code': e is ApiException ? e.code : 'network'};

Map<String, Object?> _productJson(Product p) => {'id': p.id, 'name': p.name, 'priceCents': p.priceCents};

GoRouter _router(ProviderContainer c) => c.read(routerProvider);

List<String> _location(ProviderContainer c) => _router(c).routerDelegate.currentConfiguration.uri.pathSegments;

/// The shell `HomeShell` is built with; it holds the selected tab and `goBranch`, as the tab bar uses them.
StatefulNavigationShell? _shell() {
  StatefulNavigationShell? found;
  void visit(Element e) {
    final widget = e.widget;
    if (widget is HomeShell) {
      found = widget.shell;
    } else if (found == null) {
      e.visitChildElements(visit);
    }
  }

  WidgetsBinding.instance.rootElement?.visitChildElements(visit);
  return found;
}

class _AppNode extends StepNode {
  _AppNode(this.c);

  final ProviderContainer c;

  @override
  String get name => 'App';
  @override
  Map<String, Object?> get state => const {};
  @override
  StepNode get child => _location(c).firstOrNull == 'login' ? _LoginNode(c) : _ModalNode(c);
}

/// The root navigator: the "Order placed" dialog is the only thing presented on it.
class _ModalNode extends StepNode {
  _ModalNode(this.c);

  final ProviderContainer c;
  String? get _orderId => c.read(checkoutControllerProvider).value;

  @override
  String get name => 'Modal';
  @override
  Map<String, Object?> get state => {'presented': _orderId != null};
  @override
  List<StepAction> get lends => [
        // The dialog's OK button pops it; the app acknowledges the order when the dialog closes.
        if (_orderId != null)
          StepAction('dismiss', 'Dismiss', (_) => _router(c).routerDelegate.navigatorKey.currentState!.pop()),
      ];
  @override
  StepNode get child => _orderId != null ? _OrderPlacedNode(_orderId!) : _TabsNode(c);
}

class _TabsNode extends StepNode {
  _TabsNode(this.c);

  final ProviderContainer c;
  static const _ids = ['products', 'basket'];

  @override
  String get name => 'Tabs';
  @override
  Map<String, Object?> get state => {if (_shell() case final shell?) 'selected': _ids[shell.currentIndex]};
  @override
  List<StepAction> get lends => [
        StepAction('selectTab', 'Select tab', (input) {
          final shell = _shell()!;
          final i = _ids.indexOf(input['tab']! as String);
          shell.goBranch(i, initialLocation: i == shell.currentIndex);
        }, input: const InputSchema.object({'tab': InputSchema.string(oneOf: _ids)})),
      ];
  @override
  StepNode? get child => switch (_shell()?.currentIndex) {
        0 => _StackNode(c),
        1 => _BasketNode(c),
        _ => null,
      };
}

/// The products branch's navigator: `/products` and `/products/:id`.
class _StackNode extends StepNode {
  _StackNode(this.c);

  final ProviderContainer c;

  @override
  String get name => 'Stack';
  @override
  Map<String, Object?> get state => {'depth': _location(c).length};
  @override
  List<StepAction> get lends => [
        if (_location(c).length > 1) StepAction('goBack', 'Back', (_) => _router(c).pop()),
      ];
  @override
  StepNode? get child => switch (_location(c)) {
        ['products'] => _ProductListNode(c),
        ['products', final id] => _ProductDetailNode(c, id),
        _ => null,
      };
}

class _LoginNode extends StepNode {
  _LoginNode(this.c);

  final ProviderContainer c;

  @override
  String get name => 'Login';
  @override
  Map<String, Object?> get state {
    final auth = c.read(authControllerProvider);
    return {'loading': auth.isLoading, if (auth.hasError) 'error': _error(auth.error!)};
  }

  @override
  List<StepAction> get actions => [
        if (!c.read(authControllerProvider).isLoading)
          StepAction('signIn', 'Sign in',
              (input) => c.read(authControllerProvider.notifier).login(input['email']! as String, input['password']! as String),
              input: const InputSchema.object({'email': InputSchema.string(), 'password': InputSchema.string()})),
      ];
}

class _ProductListNode extends StepNode {
  _ProductListNode(this.c);

  final ProviderContainer c;
  AsyncValue<List<Product>> get _products => c.read(productsProvider);

  @override
  String get name => 'ProductList';
  @override
  Map<String, Object?> get state {
    final products = _products;
    // The same branch the screen's `when` picks.
    return products.when(
      data: (items) => {'products': [for (final p in items) _productJson(p)], 'loading': products.isLoading},
      loading: () => {'products': const [], 'loading': true},
      error: (e, _) => {'products': const [], 'loading': products.isLoading, 'error': _error(e)},
    );
  }

  @override
  List<StepAction> get actions {
    final products = _products;
    return [
      ...products.when(
        data: (items) => [
          if (items.isNotEmpty)
            StepAction('openProduct', 'Open product', (input) => _router(c).go('/products/${input['id']}'),
                input: InputSchema.object({'id': InputSchema.string(oneOf: [for (final p in items) p.id])})),
          StepAction('refresh', 'Refresh', (_) => c.refresh(productsProvider.future)),
        ],
        loading: () => const <StepAction>[],
        error: (_, _) => [StepAction('retry', 'Retry', (_) => c.invalidate(productsProvider))],
      ),
      StepAction('signOut', 'Sign out', (_) => c.read(authControllerProvider.notifier).logout()),
    ];
  }
}

class _ProductDetailNode extends StepNode {
  _ProductDetailNode(this.c, this.id);

  final ProviderContainer c;
  final String id;
  AsyncValue<Product> get _product => c.read(productProvider(id));

  @override
  String get name => 'ProductDetail';
  @override
  Map<String, Object?> get state {
    final product = _product;
    return {
      'id': id,
      'loading': product.isLoading,
      ...product.when(
        data: (p) => {'product': {..._productJson(p), 'description': p.description}},
        loading: () => const {},
        error: (e, _) => {'error': _error(e)},
      ),
    };
  }

  @override
  List<StepAction> get actions => _product.when(
        // The screen also shows a snackbar; it is not state (profile: State).
        data: (p) => [StepAction('addToBasket', 'Add to basket', (_) => c.read(basketControllerProvider.notifier).add(p))],
        loading: () => const [],
        error: (_, _) => const [],
      );
}

class _BasketNode extends StepNode {
  _BasketNode(this.c);

  final ProviderContainer c;

  @override
  String get name => 'Basket';
  @override
  Map<String, Object?> get state {
    final lines = c.read(basketControllerProvider);
    final checkout = c.read(checkoutControllerProvider);
    return {
      'lines': [
        for (final l in lines)
          {'productId': l.product.id, 'name': l.product.name, 'priceCents': l.product.priceCents, 'quantity': l.quantity},
      ],
      'count': basketCount(lines),
      'totalCents': basketTotal(lines),
      'placing': checkout.isLoading,
      // The error shows in the bottom bar, which exists only while there are lines.
      if (lines.isNotEmpty && checkout.hasError) 'error': _error(checkout.error!),
    };
  }

  @override
  List<StepAction> get actions {
    final lines = c.read(basketControllerProvider);
    if (lines.isEmpty) return const [];
    final basket = c.read(basketControllerProvider.notifier);
    final line = InputSchema.object({'productId': InputSchema.string(oneOf: [for (final l in lines) l.product.id])});
    Product product(Map<String, Object?> input) => lines.firstWhere((l) => l.product.id == input['productId']).product;
    return [
      StepAction('addOne', 'Add one', (input) => basket.add(product(input)), input: line),
      StepAction('removeOne', 'Remove one', (input) => basket.remove(input['productId']! as String), input: line),
      if (!c.read(checkoutControllerProvider).isLoading)
        StepAction('placeOrder', 'Place order', (_) => c.read(checkoutControllerProvider.notifier).placeOrder()),
    ];
  }
}

class _OrderPlacedNode extends StepNode {
  _OrderPlacedNode(this.orderId);

  final String orderId;

  @override
  String get name => 'OrderPlaced';
  @override
  Map<String, Object?> get state => {'orderId': orderId};
}
