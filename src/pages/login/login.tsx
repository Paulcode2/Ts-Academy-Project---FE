import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "../../auth/useAuth";
import { ApiError } from "../../services/api/apiClient";
import "./login.css";

function loginError(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return "The email or password is incorrect.";
  }
  if (error instanceof ApiError && error.status === 400) {
    const details = error.details;
    const messages =
      typeof details === "object" && details !== null
        ? Object.values(details)
            .flatMap((value) => (Array.isArray(value) ? value : [value]))
            .filter((value): value is string => typeof value === "string")
        : [];
    return messages.join(" ") || "Check your email and password, then try again.";
  }
  if (error instanceof ApiError && error.status === 403) {
    return "This account is not permitted to sign in.";
  }
  if (error instanceof ApiError && error.status === 404) {
    return "The sign-in service could not be found.";
  }
  if (error instanceof ApiError && error.status === 409) {
    return "The sign-in request conflicts with the current account state.";
  }
  if (error instanceof ApiError && error.status === 500) {
    return "The server could not complete sign-in. Please try again later.";
  }
  if (error instanceof ApiError && error.status === 503) {
    return "The authentication service is temporarily unavailable.";
  }
  if (error instanceof ApiError && error.status === null) {
    return "The API could not be reached. Check the network or browser access.";
  }
  return "Unable to sign in right now. Please try again.";
}

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await auth.login({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(loginError(error));
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  if (auth.status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  const sessionMessage =
    auth.status === "loading"
      ? "Checking for an active session..."
      : auth.sessionError;

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <Link className="login-brand" to="/" aria-label="Warehouse Operations">
          <span className="login-brand-mark" aria-hidden="true">W</span>
          <span>
            <strong>WAREHOUSE</strong>
            <small>OPERATIONS</small>
          </span>
        </Link>

        <div className="login-intro">
          <p className="login-eyebrow">SECURE WORKSPACE</p>
          <h1 id="login-heading">Welcome back</h1>
          <p>Sign in to continue to your warehouse operations workspace.</p>
        </div>

        {sessionMessage && (
          <p
            className={`login-feedback${auth.sessionError ? " is-error" : ""}`}
            role={auth.sessionError ? "alert" : "status"}
          >
            {sessionMessage}
          </p>
        )}

        <form id="loginForm" className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            autoComplete="username"
            autoCapitalize="none"
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isSubmitting || auth.status === "loading"}
            aria-describedby={errorMessage ? "login-error" : undefined}
          />

          <div className="login-password-label">
            <label htmlFor="password">Password</label>
          </div>
          <div className="password-input-wrap">
            <input
              autoComplete="current-password"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting || auth.status === "loading"}
              aria-describedby={errorMessage ? "login-error" : undefined}
            />
            <button
              className="password-visibility"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              disabled={isSubmitting || auth.status === "loading"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {errorMessage && (
            <p id="login-error" className="login-feedback is-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={isSubmitting || auth.status === "loading"}
          >
            {isSubmitting ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="login-footer">Access is managed by your organization.</p>
      </section>
    </main>
  );
}
