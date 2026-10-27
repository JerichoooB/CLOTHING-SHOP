import { useEffect, useRef, useState } from "react";
import { LockKeyhole, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../context/StoreContext";
import PasswordField from "../components/PasswordField";
import "./ResetPassword.css";
export default function ResetPassword() {
  const { setUser, setModal } = useStore();
  const [token, setToken] = useState(
    () =>
      new URLSearchParams(location.hash.split("?")[1] || "").get("token") || "",
  );
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    const update = () => {
      setToken(
        new URLSearchParams(location.hash.split("?")[1] || "").get("token") ||
          "",
      );
      setDone(false);
      setError("");
    };
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  const valid = /^[a-f0-9]{64}$/.test(token);
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    if (data.password !== data.confirmPassword) {
      setError("Your passwords don’t match.");
      return;
    }
    inFlight.current = true;
    setPending(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: data.password }),
      });
      setUser(null);
      setDone(true);
      setToken("");
      history.replaceState(null, "", "#resetpassword");
    } catch (err) {
      setError(err.message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <section className="section reset-page">
      <div className="reset-card">
        <span className="recovery-icon">
          {done ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <LockKeyhole aria-hidden="true" />
          )}
        </span>
        <p className="eyebrow">YOUR CLOVER ACCOUNT</p>
        <h1>{done ? "A fresh start." : "Choose a new password."}</h1>
        <p className="recovery-copy">
          {done
            ? "Your password has been updated and existing sessions have been signed out. You can now log in with your new password."
            : valid
              ? "Use at least 8 characters. Choose a password you haven’t used elsewhere."
              : "This reset link is missing or invalid. Request a new link to continue."}
        </p>
        {done ? (
          <button
            className="primary"
            onClick={() => setModal({ type: "account" })}
          >
            LOG IN
          </button>
        ) : valid ? (
          <form className="auth-form" onSubmit={submit} aria-busy={pending}>
            <PasswordField
              label="New password"
              name="password"
              autoComplete="new-password"
              pending={pending}
            />
            <PasswordField
              label="Confirm password"
              name="confirmPassword"
              autoComplete="new-password"
              pending={pending}
            />
            {error && (
              <p className="auth-form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={pending}>
              {pending ? "UPDATING PASSWORD…" : "UPDATE PASSWORD"}
            </button>
          </form>
        ) : null}
        {!done && (
          <button
            className="account-support-link"
            disabled={pending}
            onClick={() => setModal({ type: "account", mode: "forgot" })}
          >
            Request a new reset link
          </button>
        )}
      </div>
    </section>
  );
}
