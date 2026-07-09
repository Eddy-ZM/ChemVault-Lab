import type { ChemVaultLabBindings } from "../../../src/db/bindings";

type ContactBody = {
  name?: string;
  email?: string;
  message?: string;
};

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request }) => {
  const body = (await request.json().catch(() => ({}))) as ContactBody;
  if (!body.email || !body.message) {
    return Response.json({ error: "email and message are required." }, { status: 400 });
  }

  return Response.json(
    {
      ok: true,
      status: "accepted",
      message: "Contact intake received by the Lab MVP endpoint. Configure a notification integration before using this as production support.",
    },
    { status: 202 },
  );
};
