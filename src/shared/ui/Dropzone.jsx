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

function decodeBase64ToBlob(base64Value, mimeType) {
  const sanitized = String(base64Value || "")
    .replace(/^data:[^;]+;base64,/, "")
    .replace(/\s+/g, "");

  if (!sanitized) return null;

  const binary = atob(sanitized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
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
  const generatedUrlsRef = useRef(new Map());
  const [isOver, setIsOver] = useState(false);
  const [loadingViewIds, setLoadingViewIds] = useState({});

  useEffect(() => {
    return () => {
      generatedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      generatedUrlsRef.current.clear();
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
    onChange([...(value || []), ...persistedFiles]);
  }, [onChange, value]);

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
    const existingUrl = generatedUrlsRef.current.get(id);
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
      generatedUrlsRef.current.delete(id);
    }
    const next = (value || []).filter((f) => f.id !== id);
    onChange(next);
  }

  const openInNewTab = useCallback((url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleView = useCallback(
    async (fileItem) => {
      if (!fileItem) return;

      const fileId = fileItem.id || fileItem.name;
      setLoadingViewIds((prev) => ({ ...prev, [fileId]: true }));

      try {
        if (fileItem.previewUrl) {
          openInNewTab(fileItem.previewUrl);
          return;
        }

        let enrichedFile = fileItem;
        if (!enrichedFile.contentBase64 && typeof onLoadFileContent === "function") {
          const loaded = await onLoadFileContent(fileItem);
          if (loaded?.contentBase64) {
            enrichedFile = { ...fileItem, ...loaded };
            onChange((value || []).map((row) => (row.id === fileItem.id ? enrichedFile : row)));
          }
        }

        if (!enrichedFile.contentBase64) return;

        const mimeType = enrichedFile.mimeType || enrichedFile.type || "application/octet-stream";
        const existingUrl = generatedUrlsRef.current.get(fileId);
        if (existingUrl) {
          openInNewTab(existingUrl);
          return;
        }

        const blob = decodeBase64ToBlob(enrichedFile.contentBase64, mimeType);
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        generatedUrlsRef.current.set(fileId, url);
        openInNewTab(url);
      } finally {
        setLoadingViewIds((prev) => ({ ...prev, [fileId]: false }));
      }
    },
    [onChange, onLoadFileContent, openInNewTab, value]
  );

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
            {hidePickButton ? "o usa el botón “Adjuntar fotos”." : "o usa el botón “Adjuntar”."} {accept ? `(${accept})` : ""}
          </div>
          {disabled ? <Badge tone="neutral">Lectura</Badge> : <Badge tone="info">Drag & Drop</Badge>}
        </div>

        {(value || []).length ? (
          <div className="mt-3 grid gap-2">
            {(value || []).map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-900">{f.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(f.size)} · {f.mimeType || f.type || "archivo"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {((f.contentBase64 || onLoadFileContent) && (f.mimeType || f.type || "").startsWith("image/")) || f.previewUrl ? (
                    <button
                      type="button"
                      className="text-xs text-slate-700 underline disabled:opacity-60"
                      disabled={Boolean(loadingViewIds[f.id || f.name])}
                      onClick={() => void handleView(f)}
                    >
                      {loadingViewIds[f.id || f.name] ? "Cargando..." : "Ver"}
                    </button>
                  ) : null}
                  <Button type="button" variant="ghost" className="h-9" disabled={disabled} onClick={() => remove(f.id)}>
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
