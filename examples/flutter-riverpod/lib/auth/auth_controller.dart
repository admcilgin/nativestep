import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_repository.dart';

/// The signed-in user, or null.
class AuthController extends AsyncNotifier<User?> {
  @override
  Future<User?> build() async => null;

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(authRepositoryProvider).login(email: email.trim(), password: password));
  }

  void logout() => state = const AsyncData(null);
}

final authControllerProvider = AsyncNotifierProvider<AuthController, User?>(AuthController.new);
