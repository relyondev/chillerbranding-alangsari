const PHOTO_LABELS = {
  store_before: "STORE-BEFORE",
  chiller_before: "CHILLER-BEFORE",
  chiller_after: "CHILLER-AFTER",
  wobbler_after: "WOBBLER-AFTER",
  poster_after: "POSTER-AFTER",
  spanduk_after: "SPANDUK-AFTER",
};

const SHEET_HEADERS = [
  "Timestamp","ID PIC","Nama Lengkap PIC","Tanggal Pemasangan","Cabang","Stock Point","Kode Salesman","Kode Toko",
  "Nama Toko","Nama Pemilik Toko","Nomor HP/WA","Alamat Lengkap Toko","Titik GPS Lokasi Toko","Jenis Store","Chiller",
  "Status","Alasan Toko Tidak di Branding","Foto Toko Before","Foto Chiller Before","Foto Chiller After",
  "Foto Wobbler After","Foto Poster After","Foto Spanduk After","_SYSTEM_SUBMISSION_ID"
];

function doGet() {
  return json_({ ok: true, service: "branding-ops-integration" });
}

function doPost(e) {
  try {
    const envelope = JSON.parse(e.postData.contents || "{}");
    const body = signedPayload_(envelope);
    let result;
    switch (body.op) {
      case "upload_photo": result = uploadPhoto_(body); break;
      case "delete_photo": result = deletePhoto_(body); break;
      case "read_photo": result = readPhoto_(body); break;
      case "upsert_sheet_row": result = upsertSheetRow_(body); break;
      case "health": result = { ok: true }; break;
      default: throw new Error("unsupported_operation");
    }
    return json_(Object.assign({ ok: true }, result || {}));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function props_() { return PropertiesService.getScriptProperties(); }

function hex_(bytes) {
  return bytes.map(function(b) {
    const n = b < 0 ? b + 256 : b;
    return ("0" + n.toString(16)).slice(-2);
  }).join("");
}

function signedPayload_(envelope) {
  const secret = props_().getProperty("HMAC_SECRET");
  if (!secret) throw new Error("missing_hmac_secret");
  if (typeof envelope.payload !== "string" || !/^[0-9a-f]{64}$/.test(envelope.signature || "")) {
    throw new Error("invalid_envelope");
  }

  const expected = hex_(Utilities.computeHmacSha256Signature("branding-ops\n" + envelope.payload, secret));
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ envelope.signature.charCodeAt(i);
  if (mismatch !== 0) throw new Error("invalid_signature");

  const body = JSON.parse(envelope.payload);
  if (!Number.isFinite(body.issued_at) || Math.abs(Date.now() - body.issued_at) > 5 * 60 * 1000) {
    throw new Error("signature_expired");
  }
  if (!body.request_id) throw new Error("request_id_required");
  return body;
}

function sanitize_(v) {
  return String(v || "").trim().replace(/[\\/:*?"<>|#%{}~]/g, " ").replace(/\s+/g, " ").slice(0, 120) || "UNTITLED";
}

function childFolder_(parent, name) {
  const safe = sanitize_(name);
  const it = parent.getFoldersByName(safe);
  return it.hasNext() ? it.next() : parent.createFolder(safe);
}

function uniqueStoreFolder_(parent, baseName) {
  const base = sanitize_(baseName);
  if (!parent.getFoldersByName(base).hasNext()) return parent.createFolder(base);
  let n = 2;
  while (parent.getFoldersByName(base + " (" + n + ")").hasNext()) n++;
  return parent.createFolder(base + " (" + n + ")");
}

function mimeExt_(mime) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

function uploadPhoto_(b) {
  const root = DriveApp.getFolderById(props_().getProperty("DRIVE_ROOT_ID"));
  const branch = childFolder_(root, b.branch);
  const stock = childFolder_(branch, b.stockpoint);
  const pic = childFolder_(stock, b.picFolder);
  const store = b.storeFolderId ? DriveApp.getFolderById(b.storeFolderId) : uniqueStoreFolder_(pic, b.storeName);

  const label = PHOTO_LABELS[b.photoType];
  if (!label) throw new Error("invalid_photo_type");

  const filename = [
    sanitize_(b.branchCode), sanitize_(b.stockpoint), sanitize_(b.storeCode),
    sanitize_(b.storeName), sanitize_(b.picCode), sanitize_(b.picName), label
  ].join("-") + mimeExt_(b.mimeType);

  const blob = Utilities.newBlob(Utilities.base64Decode(b.base64), b.mimeType, filename);
  const file = store.createFile(blob);

  return { fileId: file.getId(), folderId: store.getId(), fileName: filename };
}

function deletePhoto_(b) {
  try {
    const file = DriveApp.getFileById(b.fileId);
    file.setTrashed(true);
  } catch (err) {
    // Idempotent delete: missing/already trashed is considered complete.
  }
  return {};
}

function readPhoto_(b) {
  const blob = DriveApp.getFileById(b.fileId).getBlob();
  return { mimeType: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}

function ensureHeaders_(sheet) {
  const current = sheet.getRange(1,1,1,SHEET_HEADERS.length).getValues()[0];
  if (current.join("|") !== SHEET_HEADERS.join("|")) {
    sheet.getRange(1,1,1,SHEET_HEADERS.length).setValues([SHEET_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.hideColumns(SHEET_HEADERS.length);
  }
}

function upsertSheetRow_(b) {
  const ss = SpreadsheetApp.openById(props_().getProperty("SPREADSHEET_ID"));
  const sheetName = sanitize_(b.branch).toUpperCase();
  const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  ensureHeaders_(sheet);

  const keyCol = SHEET_HEADERS.length;
  const lastRow = Math.max(sheet.getLastRow(), 1);
  let rowIndex = -1;
  if (lastRow >= 2) {
    const keys = sheet.getRange(2,keyCol,lastRow-1,1).getValues().flat();
    const found = keys.findIndex(v => String(v) === String(b.submissionId));
    if (found >= 0) rowIndex = found + 2;
  }

  const values = SHEET_HEADERS.map(h => h === "_SYSTEM_SUBMISSION_ID" ? b.submissionId : (b.row[h] || ""));
  if (rowIndex < 0) rowIndex = sheet.getLastRow() + 1;
  sheet.getRange(rowIndex,1,1,values.length).setValues([values]);
  return { row: rowIndex, sheet: sheetName };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
