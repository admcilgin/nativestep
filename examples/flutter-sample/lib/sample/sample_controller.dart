import 'dart:io';

import 'package:flutter/foundation.dart';

import 'sample_repository.dart';

class SampleController extends ChangeNotifier {
  SampleController(this._repository);

  final SampleRepository _repository;

  int count = 0;
  List<Item> items = const [];
  bool loading = false;
  SampleException? error;

  void increment() {
    count++;
    notifyListeners();
  }

  void decrement() {
    if (count == 0) return;
    count--;
    notifyListeners();
  }

  void setCount(int value) {
    count = value;
    notifyListeners();
  }

  Future<void> load() async {
    if (loading) return;
    loading = true;
    error = null;
    notifyListeners();
    try {
      items = await _repository.fetchItems(1);
    } on SampleException catch (e) {
      error = e;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// Makes a raw request on purpose, to prove the nativestep network guard (sample only).
  Future<void> probeNetwork() async {
    final client = HttpClient();
    try {
      await (await client.getUrl(Uri.parse('https://example.com/'))).close();
    } catch (_) {
    } finally {
      client.close();
    }
  }
}
