import { useRef, useState } from "react";
import { CONTACT_EMAIL, CONTACT_ENDPOINT, sendContact } from "../lib/contact";
import "./InfoPage.css";
import "./Contact.css";
export default function Contact() {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState(null);
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (String(data.get("_gotcha") || "")) return;
    submitting.current = true;
    setPending(true);
    setStatus(null);
    try {
      await sendContact(data);
      form.reset();
      setStatus({
        kind: "success",
        message:
          "Thanks! Your message has been submitted. We’ll reply to the email address you provided.",
      });
    } catch (error) {
      setStatus({ kind: "error", message: error.message });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <section className="info section contact-page">
      <div className="contact-intro">
        <p className="eyebrow">WE’RE HERE TO HELP</p>
        <h1>Let’s get in touch.</h1>
        <p>Questions about a piece? Leave a message below.</p>
        <p>
          Prefer email?{" "}
          <a className="contact-email" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
      <form
        action={CONTACT_ENDPOINT}
        method="POST"
        onSubmit={submit}
        aria-busy={pending}
      >
        <input
          type="hidden"
          name="_subject"
          value="New CLOVER contact message"
        />
        <div className="contact-honeypot" aria-hidden="true">
          <label>
            Leave this field empty
            <input name="_gotcha" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label>
          Your name
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            readOnly={pending}
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            required
            type="email"
            maxLength={254}
            autoComplete="email"
            readOnly={pending}
          />
        </label>
        <label>
          Message
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={5}
            readOnly={pending}
          />
        </label>
        <p className="form-note">
          Your name, email and message are sent through Formspree so we can
          respond to your enquiry.
        </p>
        {status && (
          <p
            className={`contact-status contact-status-${status.kind}`}
            role={status.kind === "error" ? "alert" : "status"}
          >
            {status.message}
          </p>
        )}
        <button className="primary" disabled={pending}>
          {pending ? "SENDING…" : "SEND MESSAGE ⟶"}
        </button>
      </form>
    </section>
  );
}
