import { jsonUnsupported } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("OpenAI key testing is disabled in ChemVault Lab. The active MVP provider is DeepSeek through environment configuration.");
