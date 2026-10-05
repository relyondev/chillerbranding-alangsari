import { notify } from "../../components/ui/ToastHost";
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

type PhotoType =
  | "store_before"
  | "chiller_before"
  | "chiller_after"
  | "wobbler_after"
  | "poster_after"
  | "spanduk_after";


const labels: Record<PhotoType, string> = {
  store_before: "Foto Toko Before",
  chiller_before: "Foto Chiller Before",
  chiller_after: "Foto Chiller After",
  wobbler_after: "Foto Wobbler After",
  poster_after: "Foto Poster After",
  spanduk_after: "Foto Spanduk After",
};

type WatermarkMeta = {
  latitude?: number | null;
  longitude?: number | null;
  picCode?: string;
  picName?: string;
  stockpointCode?: string;
  stockpointName?: string;
};

const MAX_PHOTO_EDGE = 1600;
const INITIAL_JPEG_QUALITY = 0.82;
const MIN_JPEG_QUALITY = 0.68;
const TARGET_MAX_BYTES = 1024 * 1024;

let hanzLogoPromise: Promise<HTMLImageElement | null> | null = null;

function loadHanzLogo() {
  if (hanzLogoPromise) return hanzLogoPromise;
  hanzLogoPromise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/hm-hanzi-logo.png";
  });
  return hanzLogoPromise;
}

function formatWibTimestamp(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("day")} ${get("month").toUpperCase()} ${get("year")} · ${get("hour")}:${get("minute")}:${get("second")} WIB`;
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let output = text;
  while (output.length > 3 && ctx.measureText(`${output}…`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output.trimEnd()}…`;
}

async function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: PhotoType,
  meta: WatermarkMeta,
) {
  const minEdge = Math.min(width, height);
  const fontSize = Math.max(16, Math.min(30, Math.round(minEdge * 0.019)));
  const lineHeight = Math.round(fontSize * 1.42);
  const padding = Math.round(fontSize * 0.8);
  const margin = Math.max(14, Math.round(minEdge * 0.016));
  const logoHeight = Math.round(fontSize * 2.7);
  const logoGap = Math.round(fontSize * 0.55);
  const panelWidth = Math.min(
    width - margin * 2,
    Math.max(Math.round(width * 0.7), Math.round(fontSize * 27)),
  );
  const panelHeight = padding * 2 + logoHeight + logoGap + lineHeight * 5;
  const x = margin;
  const y = Math.max(margin, height - margin - panelHeight);

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.66)";
  ctx.fillRect(x, y, panelWidth, panelHeight);

  const logo = await loadHanzLogo();
  let textY = y + padding;

  if (logo) {
    const ratio = logo.naturalWidth / Math.max(1, logo.naturalHeight);
    const drawHeight = logoHeight;
    const drawWidth = Math.min(panelWidth - padding * 2, Math.round(drawHeight * ratio));
    ctx.drawImage(logo, x + padding, textY, drawWidth, drawHeight);
    textY += drawHeight + logoGap;
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.round(fontSize * 1.12)}px Poppins, Arial, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText("HANZ MANAGEMENT", x + padding, textY);
    textY += logoHeight + logoGap;
  }

  const latitude = Number.isFinite(meta.latitude) ? Number(meta.latitude).toFixed(6) : "-";
  const longitude = Number.isFinite(meta.longitude) ? Number(meta.longitude).toFixed(6) : "-";
  const lines = [
    formatWibTimestamp(new Date()),
    labels[type].toUpperCase(),
    `LAT ${latitude} · LNG ${longitude}`,
    `PIC ${meta.picCode || "-"} · ${(meta.picName || "-").toUpperCase()}`,
    `SP ${meta.stockpointCode || "-"} · ${(meta.stockpointName || "-").toUpperCase()}`,
  ];

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  const maxTextWidth = panelWidth - padding * 2;

  lines.forEach((line, index) => {
    ctx.font = `${index === 1 ? 700 : 500} ${fontSize}px Poppins, Arial, sans-serif`;
    ctx.fillText(fitText(ctx, line, maxTextWidth), x + padding, textY + index * lineHeight);
  });

  ctx.restore();
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal memproses foto."))),
      "image/jpeg",
      quality
    );
  });
}

async function compressPhoto(
  file: File,
  type: PhotoType,
  watermarkMeta: WatermarkMeta,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap | null = null;
  let width = 0;
  let height = 0;
  let source: CanvasImageSource;
  let cleanup: (() => void) | null = null;

  try {
    if ("createImageBitmap" in window) {
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch {
        bitmap = await createImageBitmap(file);
      }
      width = bitmap.width;
      height = bitmap.height;
      source = bitmap;
    } else {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      cleanup = () => URL.revokeObjectURL(objectUrl);
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Format foto tidak dapat dibaca."));
        image.src = objectUrl;
      });
      width = image.naturalWidth;
      height = image.naturalHeight;
      source = image;
    }

    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Browser tidak dapat memproses foto.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    await drawWatermark(ctx, targetWidth, targetHeight, type, watermarkMeta);

    let quality = INITIAL_JPEG_QUALITY;
    let blob = await canvasToBlob(canvas, quality);
    while (blob.size > TARGET_MAX_BYTES && quality > MIN_JPEG_QUALITY) {
      quality = Math.max(MIN_JPEG_QUALITY, quality - 0.04);
      blob = await canvasToBlob(canvas, quality);
    }

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap?.close();
    cleanup?.();
  }
}

export default function PhotoUploader({
  submissionId,
  hasChiller,
  watermarkMeta,
  onComplete,
}: {
  submissionId: string;
  hasChiller: boolean;
  watermarkMeta: WatermarkMeta;
  onComplete?: (ok: boolean) => void;
}) {
  const types = useMemo<PhotoType[]>(
    () =>
      hasChiller
        ? [
            "store_before",
            "chiller_before",
            "chiller_after",
            "wobbler_after",
            "poster_after",
            "spanduk_after",
          ]
        : [
            "store_before",
            "wobbler_after",
            "poster_after",
            "spanduk_after",
          ],
    [hasChiller]
  );

  const [done, setDone] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [loadingExisting, setLoadingExisting] = useState(true);
  const doneRef = useRef<Record<string, boolean>>({});
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingExisting(true);

      try {
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
          .from("submission_photos")
          .select("photo_type")
          .eq("submission_id", submissionId)
          .eq("is_active", true);

        if (error) throw error;
        if (cancelled) return;

        const initial: Record<string, boolean> = {};
        for (const row of data ?? []) {
          initial[row.photo_type] = true;
        }

        doneRef.current = initial;
        setDone(initial);
        onCompleteRef.current?.(types.every((type) => initial[type]));
      } catch {
        if (!cancelled) {
          doneRef.current = {};
          setDone({});
          onCompleteRef.current?.(false);
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [submissionId, types]);

  async function upload(type: PhotoType, file?: File) {
    if (!file) return;

    setBusy((current) => ({ ...current, [type]: true }));

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sesi login tidak ditemukan.");
      }

      const processedFile = await compressPhoto(file, type, watermarkMeta);

      const form = new FormData();
      form.append("submission_id", submissionId);
      form.append("photo_type", type);
      form.append("file", processedFile);

      const res = await fetch(
        `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/photo-upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: form,
        }
      );

      const payload = await res
        .json()
        .catch(() => ({ error: "upload_failed" }));

      if (!res.ok) {
        throw new Error(payload?.error || "Upload gagal.");
      }

      const next = { ...doneRef.current, [type]: true };
      doneRef.current = next;
      setDone(next);
      onCompleteRef.current?.(types.every((t) => next[t]));

      if (payload?.photo?.version) {
        window.dispatchEvent(
          new CustomEvent("submission-version", {
            detail: { version: payload.photo.version },
          })
        );
      }
    } catch (e) {
      notify("error", "Upload foto gagal", e instanceof Error ? e.message : "Upload gagal.");
    } finally {
      setBusy((current) => {
        const next = { ...current };
        delete next[type];
        return next;
      });
    }
  }

  if (loadingExisting) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        Memeriksa foto tersimpan...
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {types.map((type) => (
        <label
          key={type}
          className="brand-card cursor-pointer rounded-2xl p-5 transition hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="rounded-xl bg-[var(--role-pale)] p-3 text-[var(--role-accent)]">
                <Camera size={19} />
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#0B1D3A]">
                  {labels[type]}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {busy[type]
                    ? "Memproses & mengupload..."
                    : done[type]
                    ? "Sudah tersimpan · klik untuk ganti"
                    : "JPG, PNG, WEBP · max 1600 px + watermark otomatis"}
                </p>
              </div>
            </div>

            {done[type] ? (
              <CheckCircle2
                className="shrink-0 text-emerald-500"
                size={21}
              />
            ) : busy[type] ? (
              <RefreshCw
                className="shrink-0 animate-spin text-[var(--role-accent)]"
                size={20}
              />
            ) : (
              <UploadCloud
                className="shrink-0 text-slate-400"
                size={20}
              />
            )}
          </div>

          <input
            type="file"
            disabled={Boolean(busy[type])}
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              upload(type, e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
        </label>
      ))}
    </div>
  );
}
