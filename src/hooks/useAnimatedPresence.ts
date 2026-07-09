import { useEffect, useState } from "react";

export type PresenceState = "open" | "closed";

export function useAnimatedPresence(open: boolean, exitMs = 180) {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<PresenceState>(open ? "open" : "closed");

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setState("open"));
      return () => window.cancelAnimationFrame(frame);
    }

    setState("closed");
    const timeout = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(timeout);
  }, [exitMs, open]);

  return { mounted, state };
}
