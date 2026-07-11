import { describe, expect, it } from "vitest";
import { isValidLifecycleSecret } from "../src/security/lifecycle";

describe("lifecycle service authentication", () => {
  it("accepts only the dedicated exact secret", async () => {
    await expect(isValidLifecycleSecret("lifecycle-secret", "lifecycle-secret")).resolves.toBe(true);
    await expect(isValidLifecycleSecret("lifecycle-secret-x", "lifecycle-secret")).resolves.toBe(false);
    await expect(isValidLifecycleSecret("", "lifecycle-secret")).resolves.toBe(false);
  });
});
