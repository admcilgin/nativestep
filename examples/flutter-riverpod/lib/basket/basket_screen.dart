import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api.dart';
import 'basket_controller.dart';

class BasketScreen extends ConsumerWidget {
  const BasketScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lines = ref.watch(basketControllerProvider);
    final checkout = ref.watch(checkoutControllerProvider);
    ref.listen(checkoutControllerProvider, (previous, next) {
      final id = next.value;
      if (id == null || previous?.value == id) return;
      showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Order placed'),
          content: Text('Your order $id is on its way.'),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
        ),
      ).then((_) => ref.read(checkoutControllerProvider.notifier).acknowledge());
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Basket')),
      body: lines.isEmpty
          ? const Center(child: Text('Your basket is empty.'))
          : ListView(children: [
              for (final l in lines)
                ListTile(
                  title: Text(l.product.name),
                  subtitle: Text('${l.quantity} × ${formatPrice(l.product.priceCents)}'),
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    IconButton(
                      icon: const Icon(Icons.remove),
                      tooltip: 'Remove one',
                      onPressed: () => ref.read(basketControllerProvider.notifier).remove(l.product.id),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add),
                      tooltip: 'Add one',
                      onPressed: () => ref.read(basketControllerProvider.notifier).add(l.product),
                    ),
                  ]),
                ),
            ]),
      bottomNavigationBar: lines.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  if (checkout.hasError)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(errorMessage(checkout.error!), style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ),
                  Text('Total ${formatPrice(basketTotal(lines))}', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  FilledButton(
                    onPressed: checkout.isLoading ? null : () => ref.read(checkoutControllerProvider.notifier).placeOrder(),
                    child: const Text('Place order'),
                  ),
                ]),
              ),
            ),
    );
  }
}
