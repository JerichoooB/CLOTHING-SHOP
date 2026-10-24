import { useEffect, useRef, useState } from "react";
import {
  User,
  LogOut,
  Mail,
  ArrowRight,
  ShieldCheck,
  LoaderCircle,
  CircleAlert,
} from "lucide-react";
import Asset from "./Asset";
import PasswordField from "./PasswordField";
import { api } from "../lib/api";
import { useStore } from "../context/StoreContext";
import "./AccountDialog.css";
export default function AccountDialog({ onNavigate }) {
  const { user, setUser, authLoading, notify } = useStore();
  const [mode, setMode] = useState("login"),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const errorRef = useRef(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  function switchMode(next) {
    if (inFlight.current) return;
    setMode(next);
    setError("");
  }
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === "register" && data.password !== data.confirmPassword) {
      setError("Your passwords don’t match.");
      return;
    }
    inFlight.current = true;
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
      inFlight.current = false;
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
    <div className="auth-layout">
      <aside className="auth-editorial" aria-label="Clover essentials">
        <Asset
          editorial
          cell={5}
          label="Five-leaf Clover embroidery on dark fabric"
        />
        <div className="auth-editorial-brand">
          <img src="/images/clover-five-leaf.svg" alt="" /> CLOVER
        </div>
        <div className="auth-editorial-copy">
          <p className="eyebrow">SIMPLE. TIMELESS. YOURS.</p>
          <h3>
            Good things.
            <br />
            Everyday moments.
          </h3>
          <p>Your favourite pieces and every order, all in one place.</p>
        </div>
      </aside>
      <div className="auth-content">
        <img
          className="auth-mark"
          src="/images/clover-five-leaf.svg"
          alt="Five-leaf Clover"
        />
        <p className="eyebrow">YOUR CLOVER ACCOUNT</p>
        <h2>{mode === "login" ? "Welcome back." : "Make yourself at home."}</h2>
        <p className="auth-intro">
          {mode === "login"
            ? "A little closer to your everyday favourites. Sign in to view your orders and keep shopping."
            : "Create your account to check out and follow your orders, from our store to your door."}
        </p>
        <div className="auth-tabs" role="group" aria-label="Account access">
          <button
            type="button"
            aria-pressed={mode === "login"}
            disabled={pending}
            className={mode === "login" ? "selected" : ""}
            onClick={() => switchMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            aria-pressed={mode === "register"}
            disabled={pending}
            className={mode === "register" ? "selected" : ""}
            onClick={() => switchMode("register")}
          >
            Create account
          </button>
        </div>
        <form
          key={mode}
          className="auth-form"
          onSubmit={submit}
          aria-busy={pending}
        >
          {mode === "register" && (
            <label>
              Your name
              <input
                required
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={80}
                placeholder="How should we call you?"
                readOnly={pending}
              />
            </label>
          )}
          <div className="auth-email-field">
            <label htmlFor="clover-auth-email">Email address</label>
            <div className="auth-email-wrap">
              <Mail aria-hidden="true" />
              <input
                id="clover-auth-email"
                required
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="you@example.com"
                readOnly={pending}
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
          </div>
          <PasswordField
            name="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            pending={pending}
            hint={
              mode === "register" ? "Use at least 8 characters." : undefined
            }
          />
          {mode === "register" && (
            <PasswordField
              label="Confirm password"
              name="confirmPassword"
              autoComplete="new-password"
              pending={pending}
            />
          )}
          {error && (
            <div
              className="auth-form-error"
              role="alert"
              ref={errorRef}
              tabIndex={-1}
            >
              <CircleAlert aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}
          <button
            className="primary auth-submit"
            type="submit"
            disabled={pending}
          >
            {pending ? (
              <>
                <LoaderCircle className="auth-spinner" aria-hidden="true" />
                {mode === "login" ? "SIGNING IN…" : "CREATING ACCOUNT…"}
              </>
            ) : (
              <>
                {mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
                <ArrowRight aria-hidden="true" />
              </>
            )}
          </button>
        </form>
        <p className="auth-security-note">
          <ShieldCheck aria-hidden="true" />
          Your account, your orders. Always in one place.
        </p>
      </div>
    </div>
  );
}
