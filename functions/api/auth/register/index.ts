import { jsonUnsupported } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("Registration has moved to ChemVault User System. Use the Lab sign-in handoff instead.");

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("Registration has moved to ChemVault User System. Use the Lab sign-in handoff instead.");
