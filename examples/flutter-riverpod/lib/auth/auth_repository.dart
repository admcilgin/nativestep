import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api.dart';

class User {
  const User({required this.id, required this.name, required this.token});

  factory User.fromJson(Map<String, dynamic> json) =>
      User(id: json['id'] as String, name: json['name'] as String, token: json['token'] as String);

  final String id;
  final String name;
  final String token;
}

class AuthRepository {
  AuthRepository(this._dio);

  final Dio _dio;

  Future<User> login({required String email, required String password}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>('/auth/login', data: {'email': email, 'password': password});
      return User.fromJson(response.data!);
    } on DioException catch (e) {
      throw ApiException.from(e);
    }
  }
}

final authRepositoryProvider = Provider((ref) => AuthRepository(ref.watch(dioProvider)));
