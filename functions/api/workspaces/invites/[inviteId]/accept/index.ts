import { jsonUnsupported } from "../../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("Workspace invite acceptance is reserved for the next ChemVault Lab workspace phase.");
