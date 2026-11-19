import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api.dart';
import '../auth/auth_controller.dart';
import 'product_repository.dart';

class ProductListScreen extends ConsumerWidget {
  const ProductListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: products.when(
        data: (items) => RefreshIndicator(
          onRefresh: () => ref.refresh(productsProvider.future),
          child: items.isEmpty
              ? ListView(children: const [Padding(padding: EdgeInsets.all(24), child: Text('No products yet.'))])
              : ListView(children: [
                  for (final p in items)
                    ListTile(
                      title: Text(p.name),
                      subtitle: Text(formatPrice(p.priceCents)),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.go('/products/${p.id}'),
                    ),
                ]),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(errorMessage(error)),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: () => ref.invalidate(productsProvider), child: const Text('Retry')),
          ]),
        ),
      ),
    );
  }
}
