import { analyseCompatUpload, toUploadResponse } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, result, session } = await analyseCompatUpload(request, env);
  if (error) return error;
  return Response.json(toUploadResponse(result, session), { status: 201 });
};
