import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api.dart';
import '../basket/basket_controller.dart';
import 'product_repository.dart';

class ProductDetailScreen extends ConsumerWidget {
  const ProductDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = ref.watch(productProvider(id));
    return Scaffold(
      appBar: AppBar(title: Text(product.value?.name ?? '')),
      body: product.when(
        data: (p) => ListView(padding: const EdgeInsets.all(24), children: [
          Text(formatPrice(p.priceCents), style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          Text(p.description),
          const SizedBox(height: 24),
          FilledButton.icon(
            icon: const Icon(Icons.add_shopping_cart),
            label: const Text('Add to basket'),
            onPressed: () {
              ref.read(basketControllerProvider.notifier).add(p);
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(SnackBar(content: Text('${p.name} added to basket')));
            },
          ),
        ]),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(errorMessage(error))),
      ),
    );
  }
}
