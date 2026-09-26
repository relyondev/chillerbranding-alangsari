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
  wobbler_after: "Foto Wobbler",
  poster_after: "Foto Poster",
  spanduk_after: "Foto Spanduk",
};

export default function PhotoUploader({
  submissionId,
  hasChiller,
  onComplete,
}: {
  submissionId: string;
  hasChiller: boolean;
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

      const form = new FormData();
      form.append("submission_id", submissionId);
      form.append("photo_type", type);
      form.append("file", file);

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
        Memeriksa foto draft...
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
              <span className="rounded-xl bg-[#EEF6FF] p-3 text-[#1565EF]">
                <Camera size={19} />
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#0B1D3A]">
                  {labels[type]}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {busy[type]
                    ? "Sedang mengupload..."
                    : done[type]
                    ? "Sudah tersimpan · klik untuk ganti"
                    : "JPG, PNG, WEBP"}
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
                className="shrink-0 animate-spin text-[#1565EF]"
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
