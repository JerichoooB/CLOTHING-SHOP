import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { statusLabels } from "./OrderCard";
import "./AdminAnalytics.css";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (value) => currency.format(value);
const dateLabel = (value) =>
  new Date(value + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });

export default function AdminAnalytics({ refresh }) {
  const [days, setDays] = useState("30"),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [selectedDate, setSelectedDate] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    api(`/api/admin/analytics?days=${days}`, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [days, refresh, retry]);
  const selected =
    data?.daily.find((day) => day.date === selectedDate) || data?.daily.at(-1);
  const maximum = Math.max(1, ...(data?.daily.map((day) => day.revenue) || []));
  return (
    <div className="analytics">
      <div className="analytics-heading">
        <div>
          <p className="eyebrow">THE BUSINESS AT A GLANCE</p>
          <h2>Sales analytics</h2>
        </div>
        <label>
          Reporting period
          <select
            aria-label="Reporting period"
            value={days}
            onChange={(event) => setDays(event.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </div>
      <p className="analytics-note">
        Demo payments only. These figures represent simulated sales; no real
        money is collected. Reporting days use Philippine time (Asia/Manila).
      </p>
      {error ? (
        <div className="analytics-error" role="alert">
          <p>{error}</p>
          <button onClick={() => setRetry((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <p role="status">Loading sales analytics…</p>
      ) : (
        <>
          <p className="analytics-period">
            {dateLabel(data.from)} – {dateLabel(data.to)}, {data.to.slice(0, 4)}{" "}
            · {data.summary.orders} orders placed
          </p>
          <div className="analytics-metrics">
            {[
              [
                "Demo revenue",
                money(data.summary.revenue),
                "Approved, non-cancelled orders; includes shipping",
              ],
              [
                "Sales orders",
                data.summary.sales,
                "Orders with an approved demo payment",
              ],
              [
                "Units sold",
                data.summary.units,
                "Excludes cancelled and reversed orders",
              ],
              [
                "Average order value",
                money(data.summary.averageOrder),
                "Demo revenue divided by sales orders",
              ],
              [
                "Purchasing customers",
                data.summary.customers,
                "Unique customers with a sales order",
              ],
              [
                "Cancelled orders",
                data.summary.cancelled,
                "Excluded from demo revenue",
              ],
            ].map(([label, value, detail]) => (
              <article className="analytics-metric" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </div>
          <section className="analytics-panel">
            <div className="analytics-panel-heading">
              <h3>Daily demo revenue</h3>
              <span>
                Peak {money(maximum === 1 && !data.summary.sales ? 0 : maximum)}
              </span>
            </div>
            {!data.summary.sales && (
              <p className="analytics-empty">
                No sales in this period yet. Approved demo orders will appear
                here.
              </p>
            )}
            <div className="analytics-chart-scroll">
              <div
                className="analytics-chart"
                role="group"
                aria-label="Daily demo revenue; select a day for details"
              >
                {data.daily.map((day) => (
                  <button
                    key={day.date}
                    className={`analytics-bar ${day.date === selected.date ? "selected" : ""} ${day.revenue ? "" : "zero"}`}
                    style={{
                      height: `${Math.max(2, (day.revenue / maximum) * 100)}%`,
                    }}
                    aria-label={`${dateLabel(day.date)}: ${money(day.revenue)}, ${day.orders} sales orders`}
                    aria-pressed={day.date === selected.date}
                    title={`${dateLabel(day.date)} · ${money(day.revenue)} · ${day.orders} sales orders`}
                    onClick={() => setSelectedDate(day.date)}
                  />
                ))}
              </div>
            </div>
            <div className="analytics-chart-labels">
              <span>{dateLabel(data.from)}</span>
              <span>{dateLabel(data.to)}</span>
            </div>
            <p className="analytics-day" aria-live="polite">
              {dateLabel(selected.date)} ·{" "}
              <strong>{money(selected.revenue)}</strong> · {selected.orders}{" "}
              sales orders
            </p>
            <details className="analytics-daily-details">
              <summary>View daily figures</summary>
              <div className="analytics-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sales orders</th>
                      <th>Demo revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((day) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td>{day.orders}</td>
                        <td>{money(day.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <div className="analytics-columns">
            <section className="analytics-panel">
              <h3>Top products</h3>
              <p className="analytics-note">
                Ranked by units sold. Product sales exclude shipping.
              </p>
              {data.topProducts.length ? (
                <div className="analytics-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Units</th>
                        <th>Demo product sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((product) => (
                        <tr key={product.id}>
                          <td>
                            {product.name}
                            <small>Product ID {product.id}</small>
                          </td>
                          <td>{product.units}</td>
                          <td>{money(product.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="analytics-empty">
                  No products sold in this period.
                </p>
              )}
            </section>
            <section className="analytics-panel">
              <h3>Order breakdown</h3>
              <p className="analytics-note">
                Current status of orders placed during this period.
              </p>
              <dl className="analytics-breakdown">
                {data.statuses.map((row) => (
                  <div key={row.status}>
                    <dt>{statusLabels[row.status]}</dt>
                    <dd>{row.orders}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
          <div className="analytics-columns">
            <section className="analytics-panel">
              <h3>Revenue breakdown</h3>
              <dl className="analytics-breakdown">
                <div>
                  <dt>Product sales</dt>
                  <dd>{money(data.summary.merchandise)}</dd>
                </div>
                <div>
                  <dt>Shipping</dt>
                  <dd>{money(data.summary.shipping)}</dd>
                </div>
                <div>
                  <dt>Demo revenue</dt>
                  <dd>{money(data.summary.revenue)}</dd>
                </div>
                <div>
                  <dt>Reversed demo payments</dt>
                  <dd>{money(data.summary.reversed)}</dd>
                </div>
              </dl>
              <p className="analytics-note">
                Reversed amounts are shown separately and excluded from demo
                revenue. Figures reflect current payment status for orders
                placed in this period.
              </p>
            </section>
            <section className="analytics-panel">
              <h3>Inventory health</h3>
              <p className="analytics-note">
                Current stock across active products and sizes, independent of
                reporting period.
              </p>
              <dl className="analytics-breakdown">
                <div>
                  <dt>Units available</dt>
                  <dd>{data.stock.units}</dd>
                </div>
                <div>
                  <dt>Low-stock sizes</dt>
                  <dd>{data.stock.lowStock}</dd>
                </div>
                <div>
                  <dt>Out-of-stock sizes</dt>
                  <dd>{data.stock.outOfStock}</dd>
                </div>
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
