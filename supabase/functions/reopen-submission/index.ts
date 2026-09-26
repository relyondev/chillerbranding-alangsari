import { userFromRequest } from "../_shared/auth.ts";
import { callAppsScript } from "../_shared/google.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, admin } = await userFromRequest(req);
    const { submission_id, reason } = await req.json();

    const { data: start, error } = await admin.rpc(
      "begin_reopen_submission",
      {
        p_actor: user.id,
        p_submission_id: submission_id,
        p_reason: reason,
      }
    );

    if (error) throw error;

    for (const p of start.photo_file_ids ?? []) {
      await callAppsScript({
        op: "delete_photo",
        fileId: p.drive_file_id,
      });
    }

    const { error: finish } = await admin.rpc(
      "finalize_reopen_submission",
      {
        p_actor: user.id,
        p_submission_id: submission_id,
        p_reason: reason,
      }
    );

    if (finish) throw finish;

    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse(
      { error: e instanceof Error ? e.message : "reopen_failed" },
      { status: 400 }
    );
  }
});
