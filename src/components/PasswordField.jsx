import { useId, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import "./PasswordField.css";

export default function PasswordField({
  label = "Password",
  name = "password",
  autoComplete,
  pending,
  hint,
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrap">
        <LockKeyhole className="password-field-icon" aria-hidden="true" />
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          maxLength={128}
          readOnly={pending}
          placeholder={
            name === "confirmPassword"
              ? "Enter your password again"
              : "Enter your password"
          }
          aria-describedby={hint ? id + "-hint" : undefined}
        />
        <button
          type="button"
          className="password-visibility"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={id}
          disabled={pending}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </div>
      {hint && (
        <p id={id + "-hint"} className="password-field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
