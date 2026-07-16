import { LogIn, X } from "lucide-react";
import { useEffect, useState } from "react";
import { startUserSystemLogin } from "../auth/client";
import { useAnimatedPresence } from "../hooks/useAnimatedPresence";

interface AuthChoiceDialogProps {
  open: boolean;
  onClose: () => void;
  next?: string;
  mode?: "modal" | "panel";
}

export function AuthChoiceDialog({ open, onClose, next = "/analyse", mode = "modal" }: AuthChoiceDialogProps) {
  const { mounted, state } = useAnimatedPresence(open, 180);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "modal" || !mounted) return;

    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [mode, mounted, onClose]);

  if (!mounted) return null;

  const content = (
    <section
      className={mode === "modal" ? "auth-choice-dialog" : "auth-choice-panel"}
      data-state={state}
      aria-label="Choose sign-in before extraction"
    >
      <div className="auth-choice-heading">
        <div>
          <span className="eyebrow">Before extraction</span>
          <h2 id="auth-choice-title">Sign in to start an analysis.</h2>
          <p>ChemVault Lab requires an authenticated account before files can be selected, uploaded, or analysed.</p>
        </div>
        {mode === "modal" && (
          <button className="icon-button auth-choice-close" type="button" onClick={onClose} aria-label="Close sign-in choice">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="auth-choice-grid">
        <article>
          <strong>Continue with ChemVault User</strong>
          <p>Uploads, analysis history, downloads, and usage limits remain attached to your verified account.</p>
          <span>Files are not accepted until sign-in completes.</span>
          <button
            className="button primary"
            type="button"
            onClick={() => {
              setError("");
              void startUserSystemLogin(next).catch((caught) => {
                setError(caught instanceof Error ? caught.message : "User System sign-in failed.");
              });
            }}
          >
            <LogIn size={16} />
            Sign in
          </button>
          {error && <p className="form-error">{error}</p>}
        </article>
      </div>
    </section>
  );

  if (mode === "panel") return content;

  return (
    <div
      className="auth-choice-overlay"
      data-state={state}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-choice-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {content}
    </div>
  );
}
