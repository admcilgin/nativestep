import 'package:basket/basket/basket_controller.dart';
import 'package:basket/products/product.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const tea = Product(id: 'tea', name: 'Tea', priceCents: 450, description: '');
  const mug = Product(id: 'mug', name: 'Mug', priceCents: 1200, description: '');

  test('add stacks quantities, remove takes one off and drops empty lines', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final basket = container.read(basketControllerProvider.notifier);

    basket
      ..add(tea)
      ..add(mug)
      ..add(tea);
    var lines = container.read(basketControllerProvider);
    expect([for (final l in lines) '${l.product.id}×${l.quantity}'], ['tea×2', 'mug×1']);
    expect(basketCount(lines), 3);
    expect(basketTotal(lines), 2100);

    basket
      ..remove('mug')
      ..remove('tea');
    lines = container.read(basketControllerProvider);
    expect([for (final l in lines) '${l.product.id}×${l.quantity}'], ['tea×1']);
  });
}
