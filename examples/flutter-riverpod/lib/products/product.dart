class Product {
  const Product({required this.id, required this.name, required this.priceCents, required this.description});

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        name: json['name'] as String,
        priceCents: json['priceCents'] as int,
        description: json['description'] as String? ?? '',
      );

  final String id;
  final String name;
  final int priceCents;
  final String description;
}
