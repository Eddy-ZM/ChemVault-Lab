import { requireLabRecords, toProject, toWorkspace } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, session } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json({
    ...toWorkspace(session),
    members: [],
    projects: [toProject(session)],
  });
};
