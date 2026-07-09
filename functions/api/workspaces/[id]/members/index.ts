import { requireLabRecords } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, session } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json([
    {
      id: `member-${session.sub}`,
      workspaceId: "chemvault-lab",
      userId: session.sub,
      role: "owner",
      status: "active",
      invitedEmail: session.email || null,
      inviteToken: "",
      invitedByUserId: null,
      joinedAt: new Date(session.iat * 1000).toISOString(),
      createdAt: new Date(session.iat * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
};
