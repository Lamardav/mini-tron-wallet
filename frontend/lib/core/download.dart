import 'dart:js_interop';

import 'package:web/web.dart' as web;

void downloadTextFile(String fileName, String contents, String mimeType) {
  final parts = <JSAny>[contents.toJS].toJS;
  final blob = web.Blob(parts, web.BlobPropertyBag(type: mimeType));
  final url = web.URL.createObjectURL(blob);

  final link = web.HTMLAnchorElement();
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';

  web.document.body?.appendChild(link);
  link.click();
  link.remove();

  web.URL.revokeObjectURL(url);
}
