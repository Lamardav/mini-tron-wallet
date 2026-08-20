import 'package:flutter/services.dart';
import 'package:web/web.dart' as web;

Future<bool> copyToClipboard(String text) async {
  try {
    await Clipboard.setData(ClipboardData(text: text));

    return true;
  } catch (_) {
    return _copyThroughSelection(text);
  }
}

bool _copyThroughSelection(String text) {
  final body = web.document.body;

  if (body == null) {
    return false;
  }

  final field = web.HTMLTextAreaElement();
  field.value = text;
  field.setAttribute('readonly', 'true');
  field.style.position = 'fixed';
  field.style.top = '0';
  field.style.left = '0';
  field.style.opacity = '0';
  field.style.pointerEvents = 'none';

  body.appendChild(field);
  field.focus();
  field.select();

  final copied = web.document.execCommand('copy');
  field.remove();

  return copied;
}
