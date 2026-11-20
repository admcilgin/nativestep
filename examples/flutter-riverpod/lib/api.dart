import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth/auth_controller.dart';

/// What the repositories throw; the screens only see these codes.
class ApiException implements Exception {
  const ApiException(this.code);

  /// `unauthorized`, `not_found`, `out_of_stock` or `network`.
  final String code;

  factory ApiException.from(DioException e) => ApiException(switch (e.response?.statusCode) {
        401 => 'unauthorized',
        404 => 'not_found',
        409 => 'out_of_stock',
        _ => 'network',
      });

  @override
  String toString() => 'ApiException($code)';
}

String errorMessage(Object error) => switch (error) {
      ApiException(code: 'unauthorized') => 'Wrong email or password.',
      ApiException(code: 'not_found') => 'This product is no longer available.',
      ApiException(code: 'out_of_stock') => 'Some items are out of stock.',
      _ => 'Could not reach the server. Try again.',
    };

String formatPrice(int cents) => '\$${(cents / 100).toStringAsFixed(2)}';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(baseUrl: 'https://api.basket.example/v1', connectTimeout: const Duration(seconds: 10)));
  dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
    final token = ref.read(authControllerProvider).value?.token;
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }));
  return dio;
});
