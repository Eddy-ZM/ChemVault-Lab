import { LogIn, X } from "lucide-react";
import { useEffect } from "react";
import { startUserSystemLogin } from "../auth/client";
import { useAnimatedPresence } from "../hooks/useAnimatedPresence";

interface AuthChoiceDialogProps {
  open: boolean;
  onClose: () => void;
  onContinueGuest: () => void;
  next?: string;
  mode?: "modal" | "panel";
}

export function AuthChoiceDialog({ open, onClose, onContinueGuest, next = "/analyse", mode = "modal" }: AuthChoiceDialogProps) {
  const { mounted, state } = useAnimatedPresence(open, 180);

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
          <h2 id="auth-choice-title">Sign in before starting?</h2>
          <p>
            You can use ChemVault Lab either way. Signing in is better for saved workspace history; continuing without
            sign-in is faster for one-off local work.
          </p>
        </div>
        {mode === "modal" && (
          <button className="icon-button auth-choice-close" type="button" onClick={onClose} aria-label="Close sign-in choice">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="auth-choice-grid">
        <article>
          <strong>Sign in first</strong>
          <p>Private server history, authenticated downloads, and easier cross-device access.</p>
          <span>Tradeoff: takes an extra step. Local file selections may need to be reselected after login.</span>
          <button className="button primary" type="button" onClick={() => void startUserSystemLogin(next)}>
            <LogIn size={16} />
            Sign in
          </button>
        </article>
        <article>
          <strong>Continue without sign-in</strong>
          <p>Fastest path for quick extraction, classroom demos, or temporary local work.</p>
          <span>Tradeoff: history and downloads may stay local or temporary and are not tied to your account.</span>
          <button className="button secondary" type="button" onClick={onContinueGuest}>
            Continue once
          </button>
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
