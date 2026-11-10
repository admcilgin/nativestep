import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:nativestep_binding/nativestep_binding.dart';

import 'app.dart';
import 'sample/sample_controller.dart';
import 'sample/sample_repository.dart';

void main() {
  if (kDebugMode && const bool.fromEnvironment('NATIVESTEP')) return startNativeStep();
  final repository = HttpSampleRepository(Uri.parse('https://api.example.com/'));
  runApp(SampleApp(controller: SampleController(repository), tab: ValueNotifier(0)));
}
