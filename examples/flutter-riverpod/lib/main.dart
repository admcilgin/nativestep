import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nativestep_binding/nativestep_binding.dart';

import 'app.dart';

void main() {
  if (kDebugMode && const bool.fromEnvironment('NATIVESTEP')) return startNativeStep();
  runApp(const ProviderScope(child: BasketApp()));
}
