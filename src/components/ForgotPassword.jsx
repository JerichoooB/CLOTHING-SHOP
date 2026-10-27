import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Mail, Send, LoaderCircle } from "lucide-react";
import { api } from "../lib/api";
import "./ForgotPassword.css";
export default function ForgotPassword({ onBack, onNavigate }) {
  const [email, setEmail] = useState(""),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [cooldown, setCooldown] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current || cooldown) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const result = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setMessage(result.message);
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <div className="recovery-panel">
      <button className="recovery-back" onClick={onBack} disabled={pending}>
        <ArrowLeft aria-hidden="true" /> Back to log in
      </button>
      <span className="recovery-icon">
        {message ? <Send aria-hidden="true" /> : <Mail aria-hidden="true" />}
      </span>
      <p className="eyebrow">LET’S GET YOU BACK IN</p>
      <h2>{message ? "Check your inbox." : "Forgot your password?"}</h2>
      <p className="recovery-copy">
        {message ||
          "Enter the email you used for your Clover account. We’ll send a link to choose a new password."}
      </p>
      <form className="auth-form" onSubmit={submit} aria-busy={pending}>
        <label>
          Email address
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setMessage("");
              setError("");
            }}
            readOnly={pending || cooldown > 0}
            placeholder="you@example.com"
          />
        </label>
        {error && (
          <p className="auth-form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={pending || cooldown > 0}>
          {pending ? (
            <>
              <LoaderCircle aria-hidden="true" /> SENDING…
            </>
          ) : cooldown ? (
            `RESEND AVAILABLE IN ${cooldown}s`
          ) : message ? (
            "SEND ANOTHER LINK"
          ) : (
            "SEND RESET LINK"
          )}
        </button>
      </form>
      <p className="recovery-note">
        Reset links expire after 15 minutes and can only be used once.
      </p>
      <button
        className="account-support-link"
        onClick={() => onNavigate("Contact")}
        disabled={pending}
      >
        Still need help? Contact Clover
      </button>
    </div>
  );
}
