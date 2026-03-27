import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { qualityRegSchema } from "../../../domain/crm/schemas.js";
import { Badge, Button, Card, CardContent, CardHeader, Input, Label, Textarea } from "../../../shared/ui/primitives.jsx";
import Dropzone from "../../../shared/ui/Dropzone.jsx";

function Check({ label, disabled, checked, onChange }) {
  return (
    <label className={`flex items-center gap-2 text-sm ${disabled ? "text-slate-500" : "text-slate-900"}`}>
      <input type="checkbox" disabled={disabled} checked={checked} onChange={(e)=>onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function QualityRegModule({ project, canEdit, onSave }) {
  const disabled = !canEdit;
  const [filesError, setFilesError] = React.useState("");

  const form = useForm({
    resolver: zodResolver(qualityRegSchema),
    defaultValues: project.qualityReg,
    mode: "onChange",
  });

  React.useEffect(() => {
    form.reset(project.qualityReg);
    setFilesError("");
  }, [form, project.qualityReg]);

  const { register, handleSubmit, watch, setValue, formState: { isDirty, isSubmitting } } = form;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader title="Documentación (Adjuntos)" subtitle="Carga por categoría (Drag & Drop + preview)" right={<Badge tone="info">Archivos</Badge>} />
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Dropzone label="Cámara de Comercio" helper="PDF o imágenes." accept=".pdf,image/*" disabled={disabled}
            maxFileSizeBytes={10 * 1024 * 1024}
            value={watch("chamberOfCommerceFiles") || []} onChange={(v)=>setValue("chamberOfCommerceFiles", v, { shouldDirty:true, shouldValidate:true })}
            onValidationError={(message) => setFilesError(message)} />
          <Dropzone label="RUT" helper="PDF o imágenes." accept=".pdf,image/*" disabled={disabled}
            maxFileSizeBytes={10 * 1024 * 1024}
            value={watch("rutFiles") || []} onChange={(v)=>setValue("rutFiles", v, { shouldDirty:true, shouldValidate:true })}
            onValidationError={(message) => setFilesError(message)} />
          <Dropzone label="Proyecto de etiqueta" helper="Artes / renders / PDF." accept=".pdf,image/*" disabled={disabled}
            maxFileSizeBytes={10 * 1024 * 1024}
            value={watch("labelProjectFiles") || []} onChange={(v)=>setValue("labelProjectFiles", v, { shouldDirty:true, shouldValidate:true })}
            onValidationError={(message) => setFilesError(message)} />
          <Dropzone label="Ficha Técnica" helper="PDF o imágenes." accept=".pdf,image/*" disabled={disabled}
            maxFileSizeBytes={10 * 1024 * 1024}
            value={watch("technicalSheetsFiles") || []} onChange={(v)=>setValue("technicalSheetsFiles", v, { shouldDirty:true, shouldValidate:true })}
            onValidationError={(message) => setFilesError(message)} />

          {filesError ? (
            <div className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              {filesError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Pruebas de Transporte" subtitle="Checklist + notas" right={<Badge tone="neutral">QA</Badge>} />
        <CardContent className="space-y-3">
          <Check label="Vibración" disabled={disabled} checked={Boolean(watch("transportTests.vibration"))}
            onChange={(v)=>setValue("transportTests.vibration", v, { shouldDirty:true })} />
          <Check label="Temperatura" disabled={disabled} checked={Boolean(watch("transportTests.temperature"))}
            onChange={(v)=>setValue("transportTests.temperature", v, { shouldDirty:true })} />
          <Check label="Drop test (caída)" disabled={disabled} checked={Boolean(watch("transportTests.dropTest"))}
            onChange={(v)=>setValue("transportTests.dropTest", v, { shouldDirty:true })} />
          <div>
            <Label>Notas</Label>
            <Textarea disabled={disabled} {...register("transportTests.notes")} placeholder="Condiciones, resultados, criterios…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Características del Envase" subtitle="Materiales + compatibilidad" right={<Badge tone="neutral">Packaging</Badge>} />
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div><Label>Material</Label><Input disabled={disabled} {...register("packagingCharacteristics.material")} placeholder="Ej: PET / PP / PEAD / Airless" /></div>
          <div><Label>Presentación</Label><Input disabled={disabled} {...register("packagingCharacteristics.presentation")} placeholder="Ej: 120 mL, 250 mL, 1 kg" /></div>
          <div><Label>Cierre / Tapa</Label><Input disabled={disabled} {...register("packagingCharacteristics.closure")} placeholder="Ej: Flip-top, bomba, spray" /></div>
          <div><Label>Capacidad</Label><Input disabled={disabled} {...register("packagingCharacteristics.capacity")} placeholder="Ej: 100 mL" /></div>
          <div className="md:col-span-2"><Label>Notas de compatibilidad</Label><Textarea disabled={disabled} {...register("packagingCharacteristics.compatibilityNotes")} placeholder="Compatibilidad envase-formulación, migración, estrés…" /></div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title="Acciones" subtitle={disabled ? "Activa edición para guardar cambios." : "Guarda solo el módulo de Calidad y Regulatorio."}
          right={<Badge tone={disabled ? "neutral" : "warn"}>{disabled ? "Lectura" : isDirty ? "Cambios sin guardar" : "Sin cambios"}</Badge>} />
        <CardContent className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" disabled={disabled || isSubmitting || !isDirty} onClick={()=>form.reset(project.qualityReg)}>Descartar</Button>
          <Button type="button" disabled={disabled || isSubmitting || !isDirty} onClick={handleSubmit((values)=>onSave(values))}>Guardar</Button>
        </CardContent>
      </Card>
    </div>
  );
}
