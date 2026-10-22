export async function listProducts(database, id) {
  const rows = await database.query(
    `SELECT p.*,ARRAY(SELECT category FROM product_collections WHERE product_id=p.id ORDER BY category) AS collections,COALESCE((SELECT json_agg(json_build_object('id',v.id::text,'sku',v.sku,'size',v.size,'stock',v.stock,'lowStockThreshold',v.low_stock_threshold) ORDER BY v.id) FROM product_variants v WHERE v.product_id=p.id AND v.active),'[]'::json) AS variants FROM products p WHERE p.active ${id === undefined ? "" : "AND p.id=$1"} ORDER BY p.id`,
    id === undefined ? [] : [id],
  );
  return rows.rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    price: row.price_cents / 100,
    currency: row.currency,
    type: row.product_type,
    category: row.category,
    image: row.image,
    cell: row.image_cell,
    colors: row.colors,
    collections: row.collections,
    order: row.sort_order,
    ...(row.accessory_order !== null
      ? { accessoryOrder: row.accessory_order }
      : {}),
    ...(row.badge ? { badge: row.badge } : {}),
    variants: row.variants,
    sizes: row.variants.map((v) => v.size),
    stock: row.variants.reduce((sum, v) => sum + v.stock, 0),
  }));
}
