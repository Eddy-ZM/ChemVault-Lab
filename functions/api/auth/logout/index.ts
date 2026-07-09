import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async () => logoutResponse();
export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async () => logoutResponse();

function logoutResponse() {
  return Response.json({
    ok: true,
    message: "ChemVault Lab uses bearer tokens stored by the client. Clear the local Lab session on sign out.",
  });
}
