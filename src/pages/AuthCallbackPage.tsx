import { AlertTriangle, CheckCircle2, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { completeUserSystemLogin, startUserSystemLogin } from "../auth/client";

const retryKey = "chemvault_lab_auth_callback_retry_v1";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Completing ChemVault User System sign-in.");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const hasCredential = ["token", "session", "code", "user_token", "access_token"].some((key) => params.has(key));
    if (!hasCredential) {
      if (sessionStorage.getItem(retryKey) === "1") {
        setStatus("error");
        setMessage("User System did not return a Lab handoff token. Please start sign-in again.");
        return () => {
          cancelled = true;
        };
      }

      sessionStorage.setItem(retryKey, "1");
      setMessage("Restarting ChemVault User System handoff.");
      window.setTimeout(() => {
        if (cancelled) return;
        void startUserSystemLogin(params.get("next") || "/history").catch((caught) => {
          if (cancelled) return;
          setStatus("error");
          setMessage(caught instanceof Error ? caught.message : "User System sign-in failed.");
        });
      }, 250);

      return () => {
        cancelled = true;
      };
    }

    completeUserSystemLogin(window.location.search)
      .then((payload) => {
        if (cancelled) return;
        sessionStorage.removeItem(retryKey);
        setStatus("done");
        setMessage("Signed in. Redirecting to your ChemVault Lab workspace.");
        window.setTimeout(() => navigate(payload.next || "/history", { replace: true }), 350);
      })
      .catch((caught) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(caught instanceof Error ? caught.message : "User System sign-in failed.");
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="site-container auth-callback-page">
      <section className="empty-state">
        {status === "error" ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
        <span className="eyebrow">ChemVault identity</span>
        <h1>User System sign-in</h1>
        <p>{message}</p>
        {status === "error" && (
          <div className="form-actions">
            <button
              className="button primary"
              type="button"
              onClick={() => {
                setStatus("working");
                setMessage("Opening ChemVault User System.");
                void startUserSystemLogin("/history").catch((caught) => {
                  setStatus("error");
                  setMessage(caught instanceof Error ? caught.message : "User System sign-in failed.");
                });
              }}
            >
              <LogIn size={17} />
              Sign in again
            </button>
            <Link className="button secondary" to="/">
              Back to Lab
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
