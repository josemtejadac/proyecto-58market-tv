import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:signage_player/main.dart';

void main() {
  testWidgets('La app arranca y muestra una pantalla negra mientras carga', (WidgetTester tester) async {
    await tester.pumpWidget(const SignageApp());
    await tester.pump();

    expect(find.byType(ColoredBox), findsWidgets);
  });
}
