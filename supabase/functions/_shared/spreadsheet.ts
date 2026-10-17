import { callAppsScript } from "./google.ts";

const PHOTO_COLUMNS: Record<string, string> = {
  store_before: "Foto Toko Before",
  chiller_before: "Foto Chiller Before",
  chiller_after: "Foto Chiller After",
  wobbler_after: "Foto Wobbler After",
  poster_after: "Foto Poster After",
  spanduk_after: "Foto Spanduk After",
};

export async function syncSubmissionToSpreadsheet(
  admin: any,
  submissionId: string,
) {
  const { data: s, error } = await admin
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .is("deleted_at", null)
    .single();

  if (error || !s) throw error ?? new Error("submission_not_found");

  const { data: photos, error: photoError } = await admin
    .from("submission_photos")
    .select("photo_type,drive_file_id")
    .eq("submission_id", s.id)
    .eq("is_active", true);

  if (photoError) throw photoError;

  const links: Record<string, string> = {};
  for (const photo of photos ?? []) {
    const column = PHOTO_COLUMNS[photo.photo_type];
    if (column) {
      links[column] =
        `https://drive.google.com/file/d/${photo.drive_file_id}/view`;
    }
  }

  await callAppsScript({
    op: "upsert_sheet_row",
    submissionId: s.id,
    branch: s.branch_name_snapshot,
    row: {
      "Timestamp": s.submitted_at ?? s.created_at,
      "ID PIC": s.pic_code_snapshot,
      "Nama Lengkap PIC": s.pic_name_snapshot,
      "Tanggal Pemasangan": s.installation_date,
      "Cabang": s.branch_name_snapshot,
      "Stock Point": s.stockpoint_name_snapshot,
      "Kode Salesman": s.salesman_code,
      "Kode Toko": s.store_code,
      "Nama Toko": s.store_name,
      "Nama Pemilik Toko": s.owner_name,
      "Nomor HP/WA": s.owner_phone,
      "Alamat Lengkap Toko": s.store_address,
      "Titik GPS Lokasi Toko": s.google_maps_url ??
        (s.latitude != null && s.longitude != null
          ? `https://www.google.com/maps?q=${s.latitude},${s.longitude}`
          : ""),
      "Jenis Store": String(s.store_type ?? "").toUpperCase(),
      "Chiller": s.has_chiller ? "YA" : "TIDAK",
      "Status":
        s.branding_status === "brandable"
          ? "DIBRANDING"
          : "TIDAK DIBRANDING",
      "Alasan Toko Tidak di Branding": s.not_brandable_reason ?? "",
      "Foto Toko Before": links["Foto Toko Before"] ?? "",
      "Foto Chiller Before": links["Foto Chiller Before"] ?? "",
      "Foto Chiller After": links["Foto Chiller After"] ?? "",
      "Foto Wobbler After": links["Foto Wobbler After"] ?? "",
      "Foto Poster After": links["Foto Poster After"] ?? "",
      "Foto Spanduk After": links["Foto Spanduk After"] ?? "",
    },
  });

  return { submissionId: s.id, workflowStatus: s.workflow_status };
}
