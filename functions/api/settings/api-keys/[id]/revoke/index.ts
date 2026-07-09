import { jsonUnsupported } from "../../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("Developer API keys are not enabled in the merged ChemVault Lab MVP.");
