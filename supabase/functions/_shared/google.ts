export async function callAppsScript(payload: Record<string, unknown>) {
  const endpoint = Deno.env.get("APPS_SCRIPT_ENDPOINT")!;
  const secret = Deno.env.get("APPS_SCRIPT_HMAC_SECRET")!;

  if (!endpoint || !secret) {
    throw new Error("google_integration_not_configured");
  }

  const signedPayload = JSON.stringify({
    ...payload,
    issued_at: Date.now(),
    request_id: crypto.randomUUID(),
  });

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`branding-ops\n${signedPayload}`),
  );

  const signature = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payload: signedPayload,
      signature,
    }),
  });

  const raw = await response.text();

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    const contentType = response.headers.get("content-type") ?? "unknown";
    const preview = raw
      .replace(/\s+/g, " ")
      .slice(0, 180);

    throw new Error(
      `google_non_json_response status=${response.status} content_type=${contentType} body=${preview}`
    );
  }

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.error || `google_http_${response.status}`
    );
  }

  return data;
}
