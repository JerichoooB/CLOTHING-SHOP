import { useEffect, useRef, useState } from "react";
import {
  Package,
  Settings2,
  CheckCircle2,
  ShoppingBag,
  Heart,
  LogOut,
  Mail,
  ArrowRight,
  ShieldCheck,
  LoaderCircle,
  CircleAlert,
} from "lucide-react";
import Asset from "./Asset";
import PasswordField from "./PasswordField";
import ForgotPassword from "./ForgotPassword";
import { api } from "../lib/api";
import { useStore } from "../context/StoreContext";
import "./AccountDialog.css";
export default function AccountDialog({ onNavigate, initialMode }) {
  const { user, setUser, authLoading, notify, likes } = useStore();
  const [mode, setMode] = useState(
      initialMode === "forgot" ? "forgot" : "login",
    ),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [signedOut, setSignedOut] = useState(false);
  const inFlight = useRef(false);
  const errorRef = useRef(null);
  const headingRef = useRef(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    headingRef.current?.focus();
  }, [user?.id, signedOut]);
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
    if (inFlight.current) return;
    inFlight.current = true;
    setError("");
    setPending(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      setUser(null);
      setSignedOut(true);
      setMode("login");
      notify("You’re signed out.");
    } catch (err) {
      setError(err.message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  if (authLoading)
    return (
      <p role="status" className="account-loading">
        Checking your account…
      </p>
    );
  if (user) {
    const initials = user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    return (
      <div className="account-dashboard" aria-busy={pending}>
        <div className="account-cover">
          <Asset editorial cell={5} label="Clover fabric detail" />
          <span>
            <img src="/images/clover-five-leaf.svg" alt="" /> YOUR CLOVER SPACE
          </span>
        </div>
        <div className="account-dashboard-body">
          <div className="account-identity">
            <span className="account-initials" aria-hidden="true">
              {initials}
            </span>
            <span className="account-role">
              <i />
              {user.role === "admin" ? "Store administrator" : "Signed in"}
            </span>
          </div>
          <p className="eyebrow">GOOD TO SEE YOU AGAIN</p>
          <h2 ref={headingRef} tabIndex={-1}>
            Hello, {user.name}.
          </h2>
          <p className="account-email">
            <Mail aria-hidden="true" />
            {user.email}
          </p>
          <div className="account-action-cards">
            <button disabled={pending} onClick={() => onNavigate("Saved")}>
              <span className="account-action-icon">
                <Heart />
              </span>
              <span>
                <strong>Saved pieces</strong>
                <small>{likes.length} favourites saved on this device</small>
              </span>
              <ArrowRight />
            </button>
            <button disabled={pending} onClick={() => onNavigate("Orders")}>
              <span className="account-action-icon">
                <Package />
              </span>
              <span>
                <strong>My orders</strong>
                <small>Follow your orders and delivery status</small>
              </span>
              <ArrowRight />
            </button>
            {user.role === "admin" && (
              <button disabled={pending} onClick={() => onNavigate("Admin")}>
                <span className="account-action-icon">
                  <Settings2 />
                </span>
                <span>
                  <strong>Manage store</strong>
                  <small>Sales analytics, inventory and orders</small>
                </span>
                <ArrowRight />
              </button>
            )}
            <button disabled={pending} onClick={() => onNavigate("Shop")}>
              <span className="account-action-icon">
                <ShoppingBag />
              </span>
              <span>
                <strong>Explore the collection</strong>
                <small>Find your next everyday favourite</small>
              </span>
              <ArrowRight />
            </button>
          </div>
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
          <div className="account-signout-section">
            <button
              className="account-signout"
              disabled={pending}
              onClick={logout}
            >
              {pending ? (
                <LoaderCircle className="auth-spinner" aria-hidden="true" />
              ) : (
                <LogOut aria-hidden="true" />
              )}
              {pending ? "SIGNING OUT…" : "SIGN OUT"}
            </button>
            <p>Signing out keeps your shopping bag on this device.</p>
          </div>
          <button
            className="account-support-link"
            disabled={pending}
            onClick={() => onNavigate("Contact")}
          >
            Need help with your account? Contact us
          </button>
        </div>
      </div>
    );
  }
  if (signedOut)
    return (
      <div className="account-signedout">
        <span className="account-success-icon">
          <CheckCircle2 aria-hidden="true" />
        </span>
        <p className="eyebrow">UNTIL NEXT TIME</p>
        <h2 ref={headingRef} tabIndex={-1}>
          You’re signed out.
        </h2>
        <p>
          Your session has ended. Your shopping bag is still here whenever
          you’re ready.
        </p>
        <button className="primary" onClick={() => onNavigate("Shop")}>
          CONTINUE SHOPPING <ArrowRight aria-hidden="true" />
        </button>
        <button
          className="account-login-again"
          onClick={() => setSignedOut(false)}
        >
          Log in again
        </button>
      </div>
    );
  if (mode === "forgot")
    return (
      <ForgotPassword
        onBack={() => switchMode("login")}
        onNavigate={onNavigate}
      />
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
        <h2 ref={headingRef} tabIndex={-1}>
          {mode === "login" ? "Welcome back." : "Make yourself at home."}
        </h2>
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
          {mode === "login" && (
            <button
              type="button"
              className="auth-forgot"
              disabled={pending}
              onClick={() => switchMode("forgot")}
            >
              Forgot password?
            </button>
          )}
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
        <button
          className="account-support-link"
          disabled={pending}
          onClick={() => onNavigate("Contact")}
        >
          {mode === "login"
            ? "Trouble signing in? Contact us"
            : "Questions before joining? Contact us"}
        </button>
        <p className="auth-security-note">
          <ShieldCheck aria-hidden="true" />
          Your account, your orders. Always in one place.
        </p>
      </div>
    </div>
  );
}
