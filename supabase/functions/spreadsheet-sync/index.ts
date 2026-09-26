import { userFromRequest } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { syncSubmissionToSpreadsheet } from "../_shared/spreadsheet.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, admin } = await userFromRequest(req);
    const body = await req.json();

    const { data: profile } = await admin
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .single();

    if (!profile?.is_active) throw new Error("inactive_user");

    if (body?.sync_all === true) {
      if (!["admin", "super_admin"].includes(profile.role)) {
        throw new Error("forbidden");
      }

      const { data: rows, error } = await admin
        .from("submissions")
        .select("id")
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      const results = [];
      for (const row of rows ?? []) {
        try {
          await syncSubmissionToSpreadsheet(admin, row.id);
          results.push({ id: row.id, ok: true });
        } catch (e) {
          results.push({
            id: row.id,
            ok: false,
            error: e instanceof Error ? e.message : "sync_failed",
          });
        }
      }

      return jsonResponse({
        ok: true,
        total: results.length,
        succeeded: results.filter((x) => x.ok).length,
        failed: results.filter((x) => !x.ok).length,
        results,
      });
    }

    const submissionId = String(body?.submission_id ?? "");
    if (!submissionId) throw new Error("submission_id_required");

    const { data: submission, error: submissionError } = await admin
      .from("submissions")
      .select("id,pic_user_id,deleted_at")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission || submission.deleted_at) {
      throw new Error("submission_not_found");
    }

    const allowed =
      ["admin", "super_admin"].includes(profile.role) ||
      (profile.role === "pic" && submission.pic_user_id === user.id);

    if (!allowed) throw new Error("forbidden");

    await syncSubmissionToSpreadsheet(admin, submissionId);

    return jsonResponse({ ok: true, submission_id: submissionId });
  } catch (e) {
    return jsonResponse(
      { error: e instanceof Error ? e.message : "sync_failed" },
      { status: 400 }
    );
  }
});
