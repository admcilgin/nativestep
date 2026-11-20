import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../products/product.dart';
import 'order_repository.dart';

class BasketLine {
  const BasketLine(this.product, this.quantity);

  final Product product;
  final int quantity;
}

class BasketController extends Notifier<List<BasketLine>> {
  @override
  List<BasketLine> build() => const [];

  void add(Product product) {
    final present = state.any((l) => l.product.id == product.id);
    state = present
        ? [for (final l in state) l.product.id == product.id ? BasketLine(l.product, l.quantity + 1) : l]
        : [...state, BasketLine(product, 1)];
  }

  /// Takes one off; the line goes when its quantity reaches zero.
  void remove(String productId) {
    state = [
      for (final l in state)
        if (l.product.id != productId) l else if (l.quantity > 1) BasketLine(l.product, l.quantity - 1),
    ];
  }

  void clear() => state = const [];
}

final basketControllerProvider = NotifierProvider<BasketController, List<BasketLine>>(BasketController.new);

int basketCount(List<BasketLine> lines) => lines.fold(0, (n, l) => n + l.quantity);
int basketTotal(List<BasketLine> lines) => lines.fold(0, (sum, l) => sum + l.product.priceCents * l.quantity);

/// The id of the last order placed, or null.
class CheckoutController extends AsyncNotifier<String?> {
  @override
  Future<String?> build() async => null;

  Future<void> placeOrder() async {
    final lines = ref.read(basketControllerProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final id = await ref.read(orderRepositoryProvider).placeOrder(lines);
      ref.read(basketControllerProvider.notifier).clear();
      return id;
    });
  }

  void acknowledge() => state = const AsyncData(null);
}

final checkoutControllerProvider = AsyncNotifierProvider<CheckoutController, String?>(CheckoutController.new);
