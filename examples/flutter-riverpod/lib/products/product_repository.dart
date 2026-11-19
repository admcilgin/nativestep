import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api.dart';
import 'product.dart';

class ProductRepository {
  ProductRepository(this._dio);

  final Dio _dio;

  Future<List<Product>> fetchProducts() async {
    try {
      final response = await _dio.get<List<dynamic>>('/products');
      return [for (final item in response.data!) Product.fromJson(item as Map<String, dynamic>)];
    } on DioException catch (e) {
      throw ApiException.from(e);
    }
  }

  Future<Product> fetchProduct(String id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/products/$id');
      return Product.fromJson(response.data!);
    } on DioException catch (e) {
      throw ApiException.from(e);
    }
  }
}

final productRepositoryProvider = Provider((ref) => ProductRepository(ref.watch(dioProvider)));

final productsProvider = FutureProvider<List<Product>>((ref) => ref.watch(productRepositoryProvider).fetchProducts());

final productProvider =
    FutureProvider.family<Product, String>((ref, id) => ref.watch(productRepositoryProvider).fetchProduct(id));
