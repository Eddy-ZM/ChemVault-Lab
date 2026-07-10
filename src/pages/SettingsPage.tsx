import { KeyRound, Settings, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { clearSession, getStoredUser, startUserSystemLogin, type LabUser } from "../auth/client";
import { clearAnalysisHistory } from "../storage/history";
import { clearWorkspaceRecordCache } from "../storage/workspaceRecords";

const deleteConfirmationText = "Confirm";

export function SettingsPage() {
  const [user, setUser] = useState<LabUser | null>(() => getStoredUser());
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    const refresh = () => setUser(getStoredUser());
    window.addEventListener("chemvault-lab-auth-change", refresh);
    return () => window.removeEventListener("chemvault-lab-auth-change", refresh);
  }, []);

  return (
    <div className="site-container workspace-page">
      <section className="page-heading">
        <span className="eyebrow">Settings</span>
        <h1>ChemVault Lab settings.</h1>
        <p>User System identity, Lab session state, local history, and provider configuration are kept separate from Extract.</p>
      </section>

      <section className="settings-grid">
        <article className="settings-panel">
          <UserRound size={22} />
          <h2>Identity</h2>
          {user ? (
            <>
              <p>Signed in as {user.name}. Private history uses the ChemVault Lab session issued after User System verification.</p>
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  clearSession();
                  setUser(null);
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <p>Sign in with ChemVault User System to use server-side private history.</p>
              <button className="button primary" type="button" onClick={() => void startUserSystemLogin("/dashboard")}>
                <KeyRound size={17} />
                Sign in
              </button>
            </>
          )}
        </article>

        <article className="settings-panel">
          <Settings size={22} />
          <h2>Processing</h2>
          <p>AI provider, OCR provider, storage, and database bindings are configured through environment variables.</p>
          <div className="settings-list">
            <span>AI provider: DeepSeek adapter by default</span>
            <span>OCR: basic placeholder or cloud adapter</span>
            <span>Storage: local fallback, R2/D1 when configured</span>
          </div>
        </article>

        <article className="settings-panel danger-zone">
          <Trash2 size={22} />
          <h2>Local data</h2>
          <p>Clear local browser history and cached remote record summaries on this device.</p>
          {confirmClear ? (
            <div className="settings-confirmation">
              <p>
                Type <strong>{deleteConfirmationText}</strong> to clear local data.
              </p>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={deleteConfirmationText}
                aria-label={`Type ${deleteConfirmationText} to confirm clearing local data`}
              />
              <div className="inline-actions">
                <button
                  className="button danger"
                  type="button"
                  disabled={confirmation !== deleteConfirmationText}
                  onClick={() => {
                    clearAnalysisHistory();
                    clearWorkspaceRecordCache();
                    setConfirmClear(false);
                    setConfirmation("");
                  }}
                >
                  Clear
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setConfirmClear(false);
                    setConfirmation("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="button secondary" type="button" onClick={() => setConfirmClear(true)}>
              Clear local cache
            </button>
          )}
        </article>
      </section>
    </div>
  );
}
