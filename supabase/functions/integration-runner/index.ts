import { adminClient } from "../_shared/auth.ts";
import { callAppsScript } from "../_shared/google.ts";
import { syncSubmissionToSpreadsheet } from "../_shared/spreadsheet.ts";

Deno.serve(async (req) => {
  const cron = req.headers.get("X-Cron-Secret");

  if (
    Deno.env.get("CRON_SECRET") &&
    cron !== Deno.env.get("CRON_SECRET")
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const admin = adminClient();

  const { data: jobs, error } = await admin.rpc(
    "claim_integration_jobs",
    { p_limit: 10 }
  );

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const results = [];

  for (const job of jobs ?? []) {
    try {
      if (job.job_type === "spreadsheet_upsert") {
        await syncSubmissionToSpreadsheet(admin, job.entity_id);
      } else if (job.job_type === "drive_cleanup") {
        const { data: photo, error: photoError } = await admin
          .from("submission_photos")
          .select("drive_file_id")
          .eq("id", job.entity_id)
          .single();

        if (photoError) throw photoError;

        await callAppsScript({
          op: "delete_photo",
          fileId: photo.drive_file_id,
        });
      }

      await admin.rpc("finish_integration_job", {
        p_job_id: job.id,
        p_success: true,
        p_error: null,
      });

      results.push({ id: job.id, ok: true });
    } catch (e) {
      await admin.rpc("finish_integration_job", {
        p_job_id: job.id,
        p_success: false,
        p_error: e instanceof Error ? e.message : "unknown",
      });

      results.push({ id: job.id, ok: false });
    }
  }

  return Response.json({ ok: true, results });
});
