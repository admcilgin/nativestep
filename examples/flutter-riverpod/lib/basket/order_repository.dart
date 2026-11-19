import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api.dart';
import 'basket_controller.dart';

class OrderRepository {
  OrderRepository(this._dio);

  final Dio _dio;

  /// Returns the new order's id.
  Future<String> placeOrder(List<BasketLine> lines) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>('/orders', data: {
        'items': [
          for (final l in lines) {'productId': l.product.id, 'quantity': l.quantity},
        ],
      });
      return response.data!['id'] as String;
    } on DioException catch (e) {
      throw ApiException.from(e);
    }
  }
}

final orderRepositoryProvider = Provider((ref) => OrderRepository(ref.watch(dioProvider)));
