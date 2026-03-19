import React, { useCallback, useRef, useState } from "react";
import { Button, Badge } from "./primitives.jsx";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B","KB","MB","GB"];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length-1) { b/=1024; i++; }
  return `${b.toFixed(i===0?0:1)} ${units[i]}`;
}

export default function Dropzone({ label, helper, accept, disabled, value = [], onChange, hidePickButton = false }) {
  const inputRef = useRef(null);
  const [isOver, setIsOver] = useState(false);

  const addFiles = useCallback((files) => {
    const arr = Array.from(files || []).map((f) => ({
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified,
      previewUrl: f.type?.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    onChange([...(value || []), ...arr]);
  }, [onChange, value]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    if (disabled) return;
    setIsOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles, disabled]);

  const onPick = useCallback((e) => {
    if (disabled) return;
    addFiles(e.target.files);
    e.target.value = "";
  }, [addFiles, disabled]);

  function remove(id) {
    const next = (value || []).filter((f) => f.id !== id);
    onChange(next);
  }

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
                  <p className="text-xs text-slate-500">{formatBytes(f.size)} · {f.type || "archivo"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {f.previewUrl ? (
                    <a href={f.previewUrl} target="_blank" rel="noreferrer" className="text-xs text-slate-700 underline">Ver</a>
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
