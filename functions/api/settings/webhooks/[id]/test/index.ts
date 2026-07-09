import { jsonUnsupported } from "../../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("Webhooks are not part of the merged ChemVault Lab MVP.");
