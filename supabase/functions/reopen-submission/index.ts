import { userFromRequest } from "../_shared/auth.ts";
import { callAppsScript } from "../_shared/google.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

function errorMessage(error: unknown, fallback = "reopen_failed") {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    for (const key of ["message", "details", "hint", "code"]) {
      if (typeof value[key] === "string" && value[key]) return value[key] as string;
    }
    try {
      return JSON.stringify(error);
    } catch {
      // ignore
    }
  }
  return fallback;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, admin } = await userFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const submissionId = String(body?.submission_id ?? "").trim();
    const reason = String(body?.reason ?? "").trim();

    if (!submissionId) {
      return jsonResponse({ error: "submission_id_required" }, { status: 400 });
    }
    if (!reason) {
      return jsonResponse({ error: "reason_required" }, { status: 400 });
    }

    const { data: start, error: beginError } = await admin.rpc(
      "begin_reopen_submission",
      {
        p_actor: user.id,
        p_submission_id: submissionId,
        p_reason: reason,
      },
    );

    if (beginError) {
      throw new Error(`begin_reopen_failed: ${errorMessage(beginError)}`);
    }

    const photoFileIds = Array.isArray(start?.photo_file_ids)
      ? start.photo_file_ids
      : [];

    const deleteFailures: string[] = [];

    for (const photo of photoFileIds) {
      const fileId = String(photo?.drive_file_id ?? "").trim();
      if (!fileId) continue;

      try {
        await callAppsScript({ op: "delete_photo", fileId });
      } catch (error) {
        deleteFailures.push(`${fileId}: ${errorMessage(error, "delete_failed")}`);
      }
    }

    // Do not finalize if one or more Drive deletes failed. Keeping the DB in the
    // 'reopening' lock is intentional: retrying is safe because begin_reopen_submission
    // accepts an existing 'reopening' lock and Drive delete is idempotent.
    if (deleteFailures.length) {
      throw new Error(`drive_cleanup_failed: ${deleteFailures.join(" | ")}`);
    }

    const { error: finishError } = await admin.rpc(
      "finalize_reopen_submission",
      {
        p_actor: user.id,
        p_submission_id: submissionId,
        p_reason: reason,
      },
    );

    if (finishError) {
      throw new Error(`finalize_reopen_failed: ${errorMessage(finishError)}`);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = errorMessage(error);
    console.error("reopen_submission_failed", message, error);
    return jsonResponse({ error: message }, { status: 400 });
  }
});
