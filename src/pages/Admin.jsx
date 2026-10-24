import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useStore } from "../context/StoreContext";
import OrderCard, { statusLabels } from "../components/OrderCard";
import Pagination from "../components/Pagination";
import AdminAnalytics from "../components/AdminAnalytics";
import StockProductRow from "../components/StockProductRow";
import "./Admin.css";
export default function Admin() {
  const { user, authLoading, setModal, load, notify } = useStore();
  const [tab, setTab] = useState("inventory"),
    [selectedSizes, setSelectedSizes] = useState({}),
    [summary, setSummary] = useState(null),
    [data, setData] = useState(null),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [low, setLow] = useState(false),
    [status, setStatus] = useState("all"),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [movements, setMovements] = useState(null);
  useEffect(() => {
    if (user?.role !== "admin") return;
    api("/api/admin/summary")
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, [user?.id, user?.role, refresh]);
  useEffect(() => {
    if (user?.role !== "admin" || tab === "analytics") return;
    let active = true;
    setData(null);
    setError("");
    const query = new URLSearchParams({
      page: String(page),
      search,
      lowStock: low ? "1" : "0",
      status,
      grouped: "1",
    });
    api(`/api/admin/${tab === "inventory" ? "inventory" : "orders"}?${query}`)
      .then((result) => {
        if (active) setData({ ...result, kind: tab });
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [user?.id, user?.role, tab, page, search, low, status, refresh]);
  const reload = () => {
    setRefresh((n) => n + 1);
    load();
  };
  async function updateOrder(order, body) {
    await api(`/api/admin/orders/${order.id}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    notify("Order status updated.");
    reload();
  }
  async function history(item) {
    try {
      setMovements({ item, loading: true });
      const result = await api(`/api/admin/inventory/${item.id}/movements`);
      setMovements({ item, ...result });
    } catch (err) {
      setMovements(null);
      setError(err.message);
    }
  }
  if (authLoading)
    return (
      <section className="admin-page section">
        <p>Checking access…</p>
      </section>
    );
  if (!user)
    return (
      <section className="admin-page section">
        <h1>Inventory & Orders</h1>
        <p>Log in with an administrator account.</p>
        <button
          className="primary"
          onClick={() => setModal({ type: "account" })}
        >
          LOG IN
        </button>
      </section>
    );
  if (user.role !== "admin")
    return (
      <section className="admin-page section">
        <h1>Administrator access</h1>
        <p>
          This section is for store administrators. Ask the store owner to grant
          your registered account access.
        </p>
      </section>
    );
  return (
    <section className="admin-page section">
      <p className="eyebrow">CLOVER STORE MANAGEMENT</p>
      <div className="admin-title">
        <h1>Store overview</h1>
        <button onClick={reload}>Refresh ↻</button>
      </div>
      <div className="admin-stats">
        {[
          ["Products", summary?.products],
          ["Units in stock", summary?.units],
          ["Low-stock sizes", summary?.lowStock],
          ["Pending orders", summary?.pending],
        ].map(([name, value]) => (
          <div key={name}>
            <span>{name}</span>
            <strong>{value ?? "—"}</strong>
          </div>
        ))}
      </div>
      <div className="admin-tabs">
        <button
          className={tab === "analytics" ? "selected" : ""}
          onClick={() => {
            setTab("analytics");
            setError("");
          }}
        >
          Sales analytics
        </button>
        <button
          className={tab === "inventory" ? "selected" : ""}
          onClick={() => {
            setTab("inventory");
            setPage(1);
          }}
        >
          Stock monitoring
        </button>
        <button
          className={tab === "orders" ? "selected" : ""}
          onClick={() => {
            setTab("orders");
            setPage(1);
          }}
        >
          Order status
        </button>
      </div>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {tab === "analytics" ? (
        <AdminAnalytics refresh={refresh} />
      ) : tab === "inventory" ? (
        <>
          <div className="admin-filters">
            <label>
              Search product or SKU
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Hoodie, CLV-0001…"
                maxLength={80}
              />
            </label>
            <label className="low-stock-toggle">
              <input
                type="checkbox"
                checked={low}
                onChange={(e) => {
                  setLow(e.target.checked);
                  setSelectedSizes({});
                  setPage(1);
                }}
              />{" "}
              Low stock only
            </label>
          </div>
          {!data || data.kind !== tab ? (
            <p role="status">Loading stock…</p>
          ) : (
            <>
              <div className="inventory-table-wrap">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Product / SKU</th>
                      <th>Size</th>
                      <th>Available</th>
                      <th>Adjust stock</th>
                      <th>History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <StockProductRow
                        key={item.id}
                        item={item}
                        selectedId={selectedSizes[item.id]}
                        onSelect={(id) =>
                          setSelectedSizes((current) => ({
                            ...current,
                            [item.id]: id,
                          }))
                        }
                        onSaved={reload}
                        lowOnly={low}
                        onHistory={(variant) =>
                          history({ ...variant, name: item.name })
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.items.length && (
                <p className="empty">No matching stock records.</p>
              )}
              <Pagination {...data} onChange={setPage} />
            </>
          )}
          {movements && (
            <section className="stock-history">
              <div>
                <h2>
                  {movements.item.name} · {movements.item.size}
                </h2>
                <button
                  aria-label="Close stock history"
                  onClick={() => setMovements(null)}
                >
                  ×
                </button>
              </div>
              {movements.loading ? (
                <p>Loading movements…</p>
              ) : (
                movements.movements.map((row) => (
                  <p key={row.id}>
                    <strong>
                      {row.delta > 0 ? "+" : ""}
                      {row.delta}
                    </strong>{" "}
                    → {row.stockAfter} units · {row.reason}
                    <small>
                      {new Date(row.createdAt).toLocaleString()}{" "}
                      {row.actor ? "· " + row.actor : ""}
                    </small>
                  </p>
                ))
              )}
            </section>
          )}
        </>
      ) : (
        <>
          <div className="admin-filters">
            <label>
              Order status
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All statuses</option>
                {Object.entries(statusLabels).map(([value, name]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <p>Payments are simulated approvals. No money is collected.</p>
          </div>
          {!data || data.kind !== tab ? (
            <p role="status">Loading orders…</p>
          ) : (
            <>
              {data.orders.map((order) => (
                <OrderCard
                  key={order.id + order.updatedAt}
                  order={order}
                  admin
                  onUpdate={updateOrder}
                />
              ))}
              {!data.orders.length && (
                <p className="empty">No orders with this status.</p>
              )}
              <Pagination {...data} onChange={setPage} />
            </>
          )}
        </>
      )}
    </section>
  );
}
