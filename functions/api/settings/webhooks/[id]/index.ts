import { jsonUnsupported } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("Webhooks are not part of the merged ChemVault Lab MVP.");

export const onRequestPut: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("Webhooks are not part of the merged ChemVault Lab MVP.");

export const onRequestDelete: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("Webhooks are not part of the merged ChemVault Lab MVP.");
