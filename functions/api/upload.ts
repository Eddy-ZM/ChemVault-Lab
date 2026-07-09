import { assertSupportedFile, describeFileType } from "../../src/files/fileTypes";
import type { ChemVaultLabBindings } from "../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request }) => {
  const form = await request.formData();
  const files = form.getAll("files").filter((value): value is File => value instanceof File);

  const uploaded = files.map((file) => {
    assertSupportedFile(file.name);
    return {
      name: file.name,
      size: file.size,
      type: describeFileType(file.name, file.type),
      status: "accepted",
    };
  });

  return Response.json({
    ok: true,
    uploaded,
  });
};
