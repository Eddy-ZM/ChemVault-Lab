import { AlertTriangle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { AnalysisStageStatus } from "../files/types";

export function ProgressTracker({ stages }: { stages: AnalysisStageStatus[] }) {
  return (
    <section className="progress-panel" aria-label="Analysis progress">
      <h2>Analysis pipeline</h2>
      <div className="progress-list">
        {stages.map((stage) => (
          <div className={`progress-step ${stage.status}`} key={stage.key}>
            {statusIcon(stage.status)}
            <div>
              <strong>{stage.label}</strong>
              <span>{stage.detail || stage.status}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function statusIcon(status: AnalysisStageStatus["status"]) {
  if (status === "complete") return <CheckCircle2 size={18} />;
  if (status === "running") return <Loader2 size={18} className="spin" />;
  if (status === "warning" || status === "error") return <AlertTriangle size={18} />;
  return <Circle size={18} />;
}
