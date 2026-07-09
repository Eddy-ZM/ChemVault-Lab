import { KeyRound, LogIn, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clearSession, getStoredUser, login, startUserSystemLogin, type LabUser } from "../auth/client";
import { useAnimatedPresence } from "../hooks/useAnimatedPresence";

export function LoginPanel() {
  const [open, setOpen] = useState(false);
  const { mounted, state } = useAnimatedPresence(open, 150);
  const [user, setUser] = useState<LabUser | null>(() => getStoredUser());
  const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const refresh = () => setUser(getStoredUser());
    window.addEventListener("chemvault-lab-auth-change", refresh);
    return () => window.removeEventListener("chemvault-lab-auth-change", refresh);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeFromOutside = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener("keydown", closeWithEscape);
    window.addEventListener("pointerdown", closeFromOutside);
    return () => {
      window.removeEventListener("keydown", closeWithEscape);
      window.removeEventListener("pointerdown", closeFromOutside);
    };
  }, [mounted]);

  if (user) {
    return (
      <div className="login-chip">
        <UserRound size={16} />
        <span>{user.name}</span>
        <button
          type="button"
          onClick={() => {
            clearSession();
            setUser(null);
          }}
          aria-label="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="login-panel" ref={panelRef}>
      <button className="button secondary compact" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <LogIn size={16} />
        Sign in
      </button>
      {mounted && (
        <div className="login-popover" data-state={state}>
          <button
            className="button primary"
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await startUserSystemLogin();
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "User System sign-in failed");
                setBusy(false);
              }
            }}
          >
            <UserRound size={17} />
            {busy ? "Opening User System" : "Sign in with User System"}
          </button>
          <details className="local-login-fallback">
            <summary>
              <KeyRound size={15} />
              Local access code fallback
            </summary>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const nextUser = await login(name || "Lab operator", accessCode);
                  setUser(nextUser);
                  setOpen(false);
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Login failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Lab operator" />
              </label>
              <label>
                Access code
                <input
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="Private workspace code"
                  type="password"
                />
              </label>
              <button className="button secondary" type="submit" disabled={busy}>
                Save private history
              </button>
            </form>
          </details>
          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
