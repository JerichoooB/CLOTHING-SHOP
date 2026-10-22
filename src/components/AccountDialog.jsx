import { useState } from "react";
import { User, LogOut } from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../context/StoreContext";
import "./AccountDialog.css";
export default function AccountDialog({ onNavigate }) {
  const { user, setUser, authLoading, notify } = useStore();
  const [mode, setMode] = useState("login"),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === "register" && data.password !== data.confirmPassword) {
      setError("Your passwords don’t match.");
      return;
    }
    setPending(true);
    try {
      const result = await api("/api/auth/" + mode, {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });
      setUser(result.user);
      notify(
        mode === "register"
          ? "Your account is ready. Welcome to Clover!"
          : "Welcome back to Clover.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }
  async function logout() {
    setError("");
    setPending(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMode("login");
      notify("You’re signed out.");
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }
  if (authLoading)
    return (
      <p role="status" className="account-loading">
        Checking your account…
      </p>
    );
  if (user)
    return (
      <div className="account-panel">
        <User className="account-avatar" />
        <p className="eyebrow">YOUR CLOVER ACCOUNT</p>
        <h2>Hello, {user.name}.</h2>
        <p>{user.email}</p>
        <p className="account-note">
          You’re signed in. Your shopping bag is saved on this device.
        </p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="account-links">
          <button onClick={() => onNavigate("Orders")}>
            My orders & delivery status ⟶
          </button>
          {user.role === "admin" && (
            <button onClick={() => onNavigate("Admin")}>
              Inventory & order management ⟶
            </button>
          )}
        </div>
        <button className="primary" disabled={pending} onClick={logout}>
          <LogOut size={16} />
          {pending ? "SIGNING OUT…" : "SIGN OUT"}
        </button>
      </div>
    );
  return (
    <div className="account-panel">
      <p className="eyebrow">A LITTLE MORE CLOVER</p>
      <h2>{mode === "login" ? "Welcome back." : "Make yourself at home."}</h2>
      <p>
        {mode === "login"
          ? "Sign in to your Clover account."
          : "Create an account to join the Clover community."}
      </p>
      <div className="auth-tabs">
        <button
          className={mode === "login" ? "selected" : ""}
          onClick={() => {
            setMode("login");
            setError("");
          }}
        >
          Log in
        </button>
        <button
          className={mode === "register" ? "selected" : ""}
          onClick={() => {
            setMode("register");
            setError("");
          }}
        >
          Create account
        </button>
      </div>
      <form key={mode} className="auth-form" onSubmit={submit}>
        {mode === "register" && (
          <label>
            Your name
            <input
              required
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={80}
            />
          </label>
        )}
        <label>
          Email address
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            required
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={8}
            maxLength={128}
          />
        </label>
        {mode === "register" && (
          <>
            <p className="password-hint">Use at least 8 characters.</p>
            <label>
              Confirm password
              <input
                required
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
              />
            </label>
          </>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={pending}>
          {pending
            ? "PLEASE WAIT…"
            : mode === "login"
              ? "LOG IN ⟶"
              : "CREATE ACCOUNT ⟶"}
        </button>
      </form>
    </div>
  );
}
