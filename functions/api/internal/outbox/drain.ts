import type { ChemVaultLabBindings } from "../../../../src/db/bindings";
import { deliverOutboxEvents } from "../../../../src/events/outbox";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const providedSecret = request.headers.get("x-chemvault-lifecycle-key");
  if (!env.LIFECYCLE_SERVICE_SECRET || providedSecret !== env.LIFECYCLE_SERVICE_SECRET) {
    return Response.json({ error: "Unauthorized outbox drain." }, { status: 401 });
  }
  return Response.json(await deliverOutboxEvents(env, 25));
};
