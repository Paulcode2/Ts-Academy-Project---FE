import React, { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "../../auth/useAuth";
import { ApiError } from "../../services/api/apiClient";
import "./login.css";
export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submissionInFlight.current) return;
    if (isSignUp) {
      setErrorMsg(
        "Account registration is not available yet. Contact an administrator to request an account.",
      );
      return;
    }

    setErrorMsg("");
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      await auth.login({ email, password: signInPassword });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setErrorMsg("Invalid email or password.");
      } else if (error instanceof ApiError && error.status === 400) {
        const details = error.details;
        const messages =
          typeof details === "object" && details !== null
            ? Object.values(details)
                .flatMap((value) => (Array.isArray(value) ? value : [value]))
                .filter((value): value is string => typeof value === "string")
            : [];
        setErrorMsg(
          messages.join(" ") || "Please check your email and password.",
        );
      } else if (error instanceof ApiError && error.status === 403) {
        setErrorMsg("This account is not permitted to sign in.");
      } else if (error instanceof ApiError && error.status === 404) {
        setErrorMsg("The sign-in service could not be found.");
      } else if (error instanceof ApiError && error.status === 409) {
        setErrorMsg(
          "The sign-in request conflicts with the current account state.",
        );
      } else if (error instanceof ApiError && error.status === 500) {
        setErrorMsg(
          "The server could not complete sign-in. Please try again later.",
        );
      } else if (error instanceof ApiError && error.status === 503) {
        setErrorMsg("The authentication service is temporarily unavailable.");
      } else if (error instanceof ApiError && error.status === null) {
        setErrorMsg(
          "The API could not be reached. Check the network or browser CORS access.",
        );
      } else {
        setErrorMsg("Unable to sign in right now. Please try again.");
      }
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };
  if (auth.status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="login-container">
      <form id="loginForm" onSubmit={handleSubmit}>
        {/* Sign In / Sign Up switch */}
        <div className="auth-tabs">
          <button
            type="button"
            className={!isSignUp ? "active" : ""}
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg("");
            }}
          >
            Sign In
          </button>

          <button
            type="button"
            className={isSignUp ? "active" : ""}
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg("");
            }}
          >
            Sign Up
          </button>
        </div>

        {!isSignUp ? (
          /* ================= SIGN IN ================= */
          <React.Fragment key="sign-in-form">
            <h1> Sign In</h1>
            <label htmlFor="email"> Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="password"> Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
              required
            />
            <p className="error" role="alert">
              {auth.status === "loading"
                ? "Restoring session..."
                : errorMsg || auth.sessionError}
            </p>

            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting || auth.status === "loading"}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </React.Fragment>
        ) : (
          /* ================= SIGN UP ================= */
          <React.Fragment key="sign-up-form">
            <h1>Create Account</h1>

            <label htmlFor="fullName">Full Name</label>
            <input type="text" id="fullName" name="fullName" required />

            <label htmlFor="signupEmail">Email Address</label>
            <input type="email" id="signupEmail" name="signupEmail" required />

            <label htmlFor="phone">Phone Number</label>
            <input type="tel" id="phone" name="phone" required />

            <label htmlFor="signupPassword">Password</label>
            <input
              type="password"
              id="signupPassword"
              name="signupPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <p className="error" role="alert">
              {errorMsg}
            </p>

            <label htmlFor="role">Position</label>
            <select id="role" name="role" required>
              <option value="">Position</option>

              <option value="administrator">Administrator</option>

              <option value="warehouse-manager">Warehouse Manager</option>

              <option value="warehouse-staff">Warehouse Staff</option>
            </select>

            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting || auth.status === "loading"}
            >
              Create Account
            </button>
          </React.Fragment>
        )}
      </form>
    </div>
  );
}
