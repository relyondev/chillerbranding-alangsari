import { userFromRequest } from "../_shared/auth.ts";
import { callAppsScript } from "../_shared/google.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { syncSubmissionToSpreadsheet } from "../_shared/spreadsheet.ts";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const TYPES = new Set([
  "store_before",
  "chiller_before",
  "chiller_after",
  "wobbler_after",
  "poster_after",
  "spanduk_after",
]);

function bytesToBase64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function validMagic(bytes: Uint8Array, mime: string) {
  if (mime === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png")
    return bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  if (mime === "image/webp")
    return (
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
    );
  return false;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, admin } = await userFromRequest(req);
    const form = await req.formData();

    const submissionId = String(form.get("submission_id") || "");
    const photoType = String(form.get("photo_type") || "");
    const file = form.get("file");

    if (
      !(file instanceof File) ||
      !TYPES.has(photoType) ||
      !ALLOWED.has(file.type)
    ) {
      throw new Error("invalid_upload");
    }

    if (file.size > 12 * 1024 * 1024) throw new Error("file_too_large");

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validMagic(bytes, file.type))
      throw new Error("invalid_image_signature");

    const { data: s, error } = await admin
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    const { data: p } = await admin
      .from("profiles")
      .select("role,full_name,is_active")
      .eq("id", user.id)
      .single();

    if (error || !s || s.deleted_at || !p?.is_active) {
      throw new Error("submission_not_editable");
    }

    const isAdmin = ["admin", "super_admin"].includes(p?.role);
    const canEditDraft = s.workflow_status === "draft" && (s.pic_user_id === user.id || isAdmin);
    const canEditDone = s.workflow_status === "done" && isAdmin;

    if (!canEditDraft && !canEditDone) throw new Error("submission_not_editable");

    if (
      !s.has_chiller &&
      ["chiller_before", "chiller_after"].includes(photoType)
    ) {
      throw new Error("chiller_photo_not_allowed");
    }

    const google = await callAppsScript({
      op: "upload_photo",
      submissionId: s.id,
      storeFolderId: s.drive_store_folder_id ?? null,
      branch: s.branch_name_snapshot,
      branchCode: s.branch_code_snapshot,
      stockpoint: s.stockpoint_name_snapshot,
      picFolder: `${s.pic_code_snapshot} - ${s.pic_name_snapshot}`,
      storeName: s.store_name,
      storeCode: s.store_code,
      picCode: s.pic_code_snapshot,
      picName: s.pic_name_snapshot,
      photoType,
      mimeType: file.type,
      base64: bytesToBase64(bytes),
    });

    const { data: reg, error: regError } = await admin.rpc(
      "register_uploaded_photo",
      {
        p_submission_id: s.id,
        p_photo_type: photoType,
        p_drive_file_id: google.fileId,
        p_drive_folder_id: google.folderId,
        p_file_name: google.fileName,
        p_mime_type: file.type,
        p_file_size: file.size,
        p_uploaded_by: user.id,
      }
    );

    if (regError) throw regError;

    // Spreadsheet is an external integration. Do not fail the photo upload
    // if Google Sheets is temporarily unavailable.
    try {
      await syncSubmissionToSpreadsheet(admin, s.id);
    } catch (syncError) {
      console.error("spreadsheet_sync_after_photo_failed", syncError);
    }

    return jsonResponse({ ok: true, photo: reg });
  } catch (e) {
    return jsonResponse(
      { error: e instanceof Error ? e.message : "upload_failed" },
      { status: 400 }
    );
  }
});
