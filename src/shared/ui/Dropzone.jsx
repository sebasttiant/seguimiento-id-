import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Badge } from "./primitives.jsx";
import {
  base64ToBlobUrl,
  canPreviewFile,
  getPreviewSource,
  openPreviewWindow,
} from "./previewUtils.js";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B","KB","MB","GB"];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length-1) { b/=1024; i++; }
  return `${b.toFixed(i===0?0:1)} ${units[i]}`;
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
  onPreviewError,
  maxFiles,
  onValidationError,
}) {
  const popupBlockedMessage = "No se pudo abrir la vista previa. El navegador bloqueó la pestaña emergente y no se pudo usar una alternativa.";
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
    const current = valueRef.current || [];
    const selected = Array.from(files || []);
    if (Number.isFinite(maxFiles) && maxFiles > 0 && current.length + selected.length > maxFiles) {
      onValidationError?.(`Solo puedes cargar hasta ${maxFiles} imágenes de referencia.`);
      return;
    }

    const arr = await Promise.all(
      selected.map(
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
    onChange([...current, ...persistedFiles]);
  }, [maxFiles, onChange, onValidationError]);

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

    const notifyError = (message) => {
      if (typeof onPreviewError === "function") {
        onPreviewError(message);
      }
    };

    const initialPopupWindow = openPreviewWindow("about:blank");
    const popupAvailable = Boolean(initialPopupWindow && !initialPopupWindow.__fallback);
    const previewOptions = popupAvailable
      ? undefined
      : { attemptPopup: false, fallbackToSameTab: true };

    const fail = (message, popupWindow) => {
      if (popupWindow) {
        try {
          popupWindow.close?.();
        } catch {
          // Ignore close failures.
        }
      }
      notifyError(message);
    };

    try {
      const source = getPreviewSource(fileItem);

      if (source?.kind === "url") {
        const popupWindow = openPreviewWindow(source.href, initialPopupWindow, previewOptions);
        if (!popupWindow) {
          fail(popupBlockedMessage, initialPopupWindow);
        }
        return;
      }

      const cached = blobUrlCacheRef.current.get(fileId);
      if (cached) {
        const popupWindow = openPreviewWindow(cached, initialPopupWindow, previewOptions);
        if (!popupWindow) {
          fail(popupBlockedMessage, initialPopupWindow);
        }
        return;
      }

      if (source?.kind === "base64") {
        const url = base64ToBlobUrl(source.base64, source.mimeType);
        if (url) {
          blobUrlCacheRef.current.set(fileId, url);
          const popupWindow = openPreviewWindow(url, initialPopupWindow, previewOptions);
          if (!popupWindow) {
            fail(popupBlockedMessage, initialPopupWindow);
          }
          return;
        }

        fail("No se pudo preparar la vista previa de la imagen.");
        return;
      }

      if (typeof onLoadFileContent === "function") {
        const loaded = await onLoadFileContent(fileItem);
        if (loaded?.contentBase64 || loaded?.previewUrl || loaded?.fileUrl || loaded?.downloadUrl || loaded?.url) {
          const enriched = { ...fileItem, ...loaded };
          const currentValue = valueRef.current || [];
          onChange(currentValue.map((row) => (row.id === fileItem.id ? enriched : row)));

          const enrichedSource = getPreviewSource(enriched);
          if (enrichedSource?.kind === "url") {
            if (!openPreviewWindow(enrichedSource.href, initialPopupWindow, previewOptions)) {
              fail(popupBlockedMessage, initialPopupWindow);
            }
            return;
          }

          if (enrichedSource?.kind === "base64") {
            const mime = enrichedSource.mimeType;
            const url = base64ToBlobUrl(enrichedSource.base64, mime);
            if (url) {
              blobUrlCacheRef.current.set(fileId, url);
              if (!openPreviewWindow(url, initialPopupWindow, previewOptions)) {
                fail(popupBlockedMessage, initialPopupWindow);
              }
              return;
            }
          }

          fail("No se pudo preparar la vista previa de la imagen.", initialPopupWindow);
          return;
        }

        fail("No se pudo cargar la imagen para la vista previa.", initialPopupWindow);
        return;
      }

      fail("Este archivo no tiene vista previa disponible.");
    } finally {
      setLoadingIds((prev) => ({ ...prev, [fileId]: false }));
    }
  }

  const canShowView = (f) => {
    return canPreviewFile(f, onLoadFileContent);
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
