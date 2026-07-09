import type { ChemVaultLabBindings } from "../../src/db/bindings";

export const onRequest: PagesFunction<ChemVaultLabBindings> = async ({ params, request }) => {
  const pathParam = params.path;
  const path = Array.isArray(pathParam) ? pathParam.join("/") : String(pathParam || "");
  return Response.json(
    {
      error: "This ChemVault Extract API route has moved or is not implemented in the ChemVault Lab MVP.",
      method: request.method,
      path: `/api/${path}`,
      replacement: "Use ChemVault Lab endpoints at https://lab.chemvault.science/api.",
      availableCoreRoutes: [
        "/api/upload",
        "/api/analyse",
        "/api/history",
        "DELETE /api/history/:id",
        "/api/download/:id/:format",
        "/api/documents",
        "/api/search",
        "/api/exports",
        "/api/usage/current-month",
      ],
    },
    { status: 410 },
  );
};
