import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Badge } from "./primitives.jsx";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B","KB","MB","GB"];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length-1) { b/=1024; i++; }
  return `${b.toFixed(i===0?0:1)} ${units[i]}`;
}

function base64ToBlobUrl(base64Value, mimeType) {
  const cleaned = String(base64Value || "")
    .replace(/^data:[^;]+;base64,/, "")
    .replace(/\s+/g, "");

  if (!cleaned) return null;

  try {
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export default function Dropzone({
  label,
  helper,
  accept,
  disabled,
  value = [],
  onChange,
  hidePickButton = false,
  onLoadFileContent,
}) {
  const inputRef = useRef(null);
  const blobUrlCacheRef = useRef(new Map());
  const [isOver, setIsOver] = useState(false);
  const [loadingIds, setLoadingIds] = useState({});

  // Keep a mutable ref to current value so handleView never has a stale closure
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    return () => {
      blobUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlCacheRef.current.clear();
    };
  }, []);

  const addFiles = useCallback(async (files) => {
    const arr = await Promise.all(
      Array.from(files || []).map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = typeof reader.result === "string" ? reader.result : "";
              const commaIndex = result.indexOf(",");
              const contentBase64 = commaIndex >= 0 ? result.slice(commaIndex + 1) : "";

              resolve({
                id:
                  typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                name: file.name,
                size: file.size,
                mimeType: file.type || "application/octet-stream",
                contentBase64,
                uploadedAt: new Date().toISOString(),
              });
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          })
      ),
    );

    const persistedFiles = arr.filter(Boolean);
    onChange([...(valueRef.current || []), ...persistedFiles]);
  }, [onChange]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    if (disabled) return;
    setIsOver(false);
    void addFiles(e.dataTransfer.files);
  }, [addFiles, disabled]);

  const onPick = useCallback((e) => {
    if (disabled) return;
    void addFiles(e.target.files);
    e.target.value = "";
  }, [addFiles, disabled]);

  function remove(id) {
    const cached = blobUrlCacheRef.current.get(id);
    if (cached) {
      URL.revokeObjectURL(cached);
      blobUrlCacheRef.current.delete(id);
    }
    const next = (valueRef.current || []).filter((f) => f.id !== id);
    onChange(next);
  }

  async function handleView(fileItem) {
    if (!fileItem) return;

    const fileId = fileItem.id || fileItem.name;
    setLoadingIds((prev) => ({ ...prev, [fileId]: true }));

    try {
      // 1) If the file already has a previewUrl (freshly picked File object), use it
      if (fileItem.previewUrl) {
        window.open(fileItem.previewUrl, "_blank", "noopener,noreferrer");
        return;
      }

      // 2) If we already generated a blob URL for this file, reuse it
      const cached = blobUrlCacheRef.current.get(fileId);
      if (cached) {
        window.open(cached, "_blank", "noopener,noreferrer");
        return;
      }

      // 3) If contentBase64 is already in memory, build blob URL from it
      if (fileItem.contentBase64) {
        const mime = fileItem.mimeType || fileItem.type || "application/octet-stream";
        const url = base64ToBlobUrl(fileItem.contentBase64, mime);
        if (url) {
          blobUrlCacheRef.current.set(fileId, url);
          window.open(url, "_blank", "noopener,noreferrer");
        }
        return;
      }

      // 4) Lazy load: fetch contentBase64 from backend
      if (typeof onLoadFileContent === "function") {
        const loaded = await onLoadFileContent(fileItem);
        if (loaded?.contentBase64) {
          // Merge the loaded data into the file item and update parent state
          const enriched = { ...fileItem, ...loaded };
          const currentValue = valueRef.current || [];
          onChange(currentValue.map((row) => (row.id === fileItem.id ? enriched : row)));

          const mime = enriched.mimeType || enriched.type || "application/octet-stream";
          const url = base64ToBlobUrl(enriched.contentBase64, mime);
          if (url) {
            blobUrlCacheRef.current.set(fileId, url);
            window.open(url, "_blank", "noopener,noreferrer");
          }
        }
      }
    } finally {
      setLoadingIds((prev) => ({ ...prev, [fileId]: false }));
    }
  }

  const canShowView = (f) => {
    if (f.previewUrl) return true;
    const isImage = (f.mimeType || f.type || "").startsWith("image/");
    if (!isImage) return false;
    if (f.contentBase64) return true;
    if (typeof onLoadFileContent === "function") return true;
    return false;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
        </div>

        {!hidePickButton ? (
          <Button type="button" variant="outline" className="h-9" disabled={disabled} onClick={() => inputRef.current?.click()}>
            Adjuntar
          </Button>
        ) : null}
      </div>

      <div
        className={`rounded-2xl border bg-white p-4 transition ${isOver ? "border-slate-400 bg-slate-50" : "border-slate-200"}`}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={onDrop}
      >
        <input ref={inputRef} type="file" accept={accept} multiple onChange={onPick} className="hidden" />
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="text-sm font-medium text-slate-900">Arrastra y suelta archivos aquí</div>
          <div className="text-xs text-slate-500">
            {hidePickButton ? "o usa el botón \u201cAdjuntar fotos\u201d." : "o usa el botón \u201cAdjuntar\u201d."} {accept ? `(${accept})` : ""}
          </div>
          {disabled ? <Badge tone="neutral">Lectura</Badge> : <Badge tone="info">Drag & Drop</Badge>}
        </div>

        {(value || []).length ? (
          <div className="mt-3 grid gap-2">
            {(value || []).map((f) => {
              const fId = f.id || f.name;
              const isLoading = Boolean(loadingIds[fId]);
              return (
                <div key={f.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-900">{f.name}</p>
                    <p className="text-xs text-slate-500">{formatBytes(f.size)} · {f.mimeType || f.type || "archivo"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canShowView(f) ? (
                      <button
                        type="button"
                        className="text-xs text-slate-700 underline disabled:opacity-60"
                        disabled={isLoading}
                        onClick={() => void handleView(f)}
                      >
                        {isLoading ? "Cargando\u2026" : "Ver"}
                      </button>
                    ) : null}
                    <Button type="button" variant="ghost" className="h-9" disabled={disabled} onClick={() => remove(f.id)}>
                      Quitar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
