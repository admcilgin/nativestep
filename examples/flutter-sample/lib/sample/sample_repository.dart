import 'dart:convert';
import 'dart:io';

class Item {
  const Item(this.id, this.title);

  final String id;
  final String title;
}

class SampleException implements Exception {
  const SampleException(this.code, [this.message]);

  final String code;
  final String? message;
}

abstract class SampleRepository {
  Future<List<Item>> fetchItems(int page);
}

class HttpSampleRepository implements SampleRepository {
  HttpSampleRepository(this.baseUrl);

  final Uri baseUrl;

  @override
  Future<List<Item>> fetchItems(int page) async {
    final client = HttpClient();
    try {
      final request = await client.getUrl(baseUrl.resolve('items?page=$page'));
      final response = await request.close();
      if (response.statusCode != 200) throw SampleException('http_${response.statusCode}');
      final body = jsonDecode(await response.transform(utf8.decoder).join()) as Map<String, dynamic>;
      return [for (final i in body['items'] as List) Item(i['id'] as String, i['title'] as String)];
    } on SocketException catch (e) {
      throw SampleException('offline', e.message);
    } finally {
      client.close();
    }
  }
}
