import { transaction } from "./db.js";
import { fail } from "./security.js";

const scope = `WITH bounds AS (
 SELECT (now() AT TIME ZONE 'Asia/Manila')::date - ($1::int - 1) AS first_day,
        (now() AT TIME ZONE 'Asia/Manila')::date AS last_day
), scoped AS (
 SELECT o.*,p.status AS payment_status FROM orders o
 JOIN payments p ON p.order_id=o.id CROSS JOIN bounds b
 WHERE o.created_at >= (b.first_day::timestamp AT TIME ZONE 'Asia/Manila')
   AND o.created_at < ((b.last_day+1)::timestamp AT TIME ZONE 'Asia/Manila')
)`;
const sale = "status <> 'cancelled' AND payment_status = 'approved'";
const pesos = (value) => Number(value) / 100;

export async function salesAnalytics(database, input = "30") {
  if (typeof input !== "string" || !["7", "30", "90"].includes(input))
    fail(400, "Choose a reporting period of 7, 30 or 90 days.");
  const days = Number(input);
  return transaction(database, async (client) => {
    await client.query(
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    const totals = (
      await client.query(
        `${scope}
      SELECT count(*)::int AS orders,
       count(*) FILTER(WHERE ${sale})::int AS sales,
       count(*) FILTER(WHERE status='cancelled')::int AS cancelled,
       count(DISTINCT user_id) FILTER(WHERE ${sale})::int AS customers,
       COALESCE(sum(total_cents) FILTER(WHERE ${sale}),0)::text AS revenue,
       COALESCE(sum(subtotal_cents) FILTER(WHERE ${sale}),0)::text AS merchandise,
       COALESCE(sum(shipping_cents) FILTER(WHERE ${sale}),0)::text AS shipping,
       COALESCE(sum(total_cents) FILTER(WHERE payment_status='reversed'),0)::text AS reversed,
       (SELECT COALESCE(sum(i.quantity),0)::int FROM order_items i JOIN scoped s ON s.id=i.order_id WHERE s.${sale}) AS units
      FROM scoped`,
        [days],
      )
    ).rows[0];
    const daily = (
      await client.query(
        `${scope}, dates AS (
       SELECT generate_series(first_day::timestamp,last_day::timestamp,'1 day')::date AS day FROM bounds
      ), sales AS (
       SELECT (created_at AT TIME ZONE 'Asia/Manila')::date AS day,
        sum(total_cents) AS revenue,count(*) AS orders FROM scoped WHERE ${sale} GROUP BY 1
      ) SELECT d.day::text AS date,COALESCE(s.revenue,0)::text AS revenue,
        COALESCE(s.orders,0)::int AS orders FROM dates d LEFT JOIN sales s USING(day) ORDER BY d.day`,
        [days],
      )
    ).rows;
    const topProducts = (
      await client.query(
        `${scope}
      SELECT i.product_id AS id,p.name,sum(i.quantity)::int AS units,
       sum(i.line_total_cents)::text AS revenue
      FROM scoped s JOIN order_items i ON i.order_id=s.id JOIN products p ON p.id=i.product_id
      WHERE s.${sale} GROUP BY i.product_id,p.name ORDER BY sum(i.quantity) DESC,sum(i.line_total_cents) DESC,i.product_id LIMIT 5`,
        [days],
      )
    ).rows;
    const statuses = (
      await client.query(
        `${scope} SELECT status,count(*)::int AS orders FROM scoped GROUP BY status`,
        [days],
      )
    ).rows;
    const stock = (
      await client.query(`SELECT COALESCE(sum(v.stock),0)::int AS units,
      count(*) FILTER(WHERE v.stock=0)::int AS "outOfStock",
      count(*) FILTER(WHERE v.stock>0 AND v.stock<=v.low_stock_threshold)::int AS "lowStock"
      FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.active AND p.active`)
    ).rows[0];
    return {
      days,
      timezone: "Asia/Manila",
      currency: "PHP",
      simulated: true,
      from: daily[0].date,
      to: daily.at(-1).date,
      summary: {
        orders: totals.orders,
        sales: totals.sales,
        cancelled: totals.cancelled,
        customers: totals.customers,
        units: totals.units,
        revenue: pesos(totals.revenue),
        merchandise: pesos(totals.merchandise),
        shipping: pesos(totals.shipping),
        reversed: pesos(totals.reversed),
        averageOrder: totals.sales ? pesos(totals.revenue) / totals.sales : 0,
      },
      daily: daily.map((row) => ({ ...row, revenue: pesos(row.revenue) })),
      topProducts: topProducts.map((row) => ({
        ...row,
        revenue: pesos(row.revenue),
      })),
      statuses: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ].map((status) => ({
        status,
        orders: statuses.find((row) => row.status === status)?.orders || 0,
      })),
      stock,
    };
  });
}
