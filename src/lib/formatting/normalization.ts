export function normalizeText(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`;
  return digits;
}


export function formatBrandingStatus(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "brandable") return "DIBRANDING";
  if (normalized === "not_brandable") return "TIDAK DIBRANDING";
  if (!normalized) return "—";
  return String(value).toUpperCase();
}
