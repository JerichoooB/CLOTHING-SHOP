import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useStore } from "../context/StoreContext";
import OrderCard from "../components/OrderCard";
import Pagination from "../components/Pagination";
import "./Orders.css";
export default function Orders() {
  const { user, authLoading, setModal } = useStore();
  const [data, setData] = useState(null),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setData(null);
    setError("");
    api("/api/orders?page=" + page)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [user?.id, page, refresh]);
  return (
    <section className="orders-page section">
      <p className="eyebrow">YOUR CLOVER JOURNEY</p>
      <div className="orders-title">
        <h1>My Orders</h1>
        {user && (
          <button onClick={() => setRefresh((n) => n + 1)}>
            Refresh status ↻
          </button>
        )}
      </div>
      {authLoading ? (
        <p role="status">Checking your account…</p>
      ) : !user ? (
        <>
          <p>Log in to view your orders and delivery status.</p>
          <button
            className="primary"
            onClick={() => setModal({ type: "account" })}
          >
            LOG IN / CREATE ACCOUNT
          </button>
        </>
      ) : error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : !data ? (
        <p role="status">Loading your orders…</p>
      ) : data.orders.length ? (
        <>
          {data.orders.map((order) => (
            <OrderCard key={order.id + order.updatedAt} order={order} />
          ))}
          <Pagination {...data} onChange={setPage} />
        </>
      ) : (
        <p className="empty">
          No orders yet. Your next everyday favourite is waiting in Shop.
        </p>
      )}
    </section>
  );
}
