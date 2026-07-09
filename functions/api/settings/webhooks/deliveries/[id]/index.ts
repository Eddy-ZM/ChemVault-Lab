import { jsonUnsupported } from "../../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("Webhook deliveries are not part of the merged ChemVault Lab MVP.");
