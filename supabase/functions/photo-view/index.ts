import { userFromRequest } from "../_shared/auth.ts";
import { callAppsScript } from "../_shared/google.ts";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, admin } = await userFromRequest(req);
    const url = new URL(req.url);
    const photoId = url.searchParams.get("photo_id");

    if (!photoId) throw new Error("photo_id_required");

    const { data: p, error } = await admin
      .from("submission_photos")
      .select("*,submissions(pic_user_id,deleted_at)")
      .eq("id", photoId)
      .eq("is_active", true)
      .single();

    if (error || !p || p.submissions.deleted_at) {
      throw new Error("photo_not_found");
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      p.submissions.pic_user_id !== user.id &&
      !["admin", "super_admin", "client"].includes(profile?.role)
    ) {
      throw new Error("forbidden");
    }

    const g = await callAppsScript({
      op: "read_photo",
      fileId: p.drive_file_id,
    });

    const bin = Uint8Array.from(atob(g.base64), (c) => c.charCodeAt(0));

    return new Response(bin, {
      headers: {
        ...corsHeaders,
        "Content-Type": g.mimeType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    return jsonResponse(
      { error: e instanceof Error ? e.message : "photo_view_failed" },
      { status: 400 }
    );
  }
});
