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

  const form = useForm({
    resolver: zodResolver(qualityRegSchema),
    defaultValues: project.qualityReg,
    mode: "onChange",
  });

  const { register, handleSubmit, watch, setValue, formState: { isDirty, isSubmitting } } = form;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader title="Documentación (Adjuntos)" subtitle="Carga por categoría (Drag & Drop + preview)" right={<Badge tone="info">Archivos</Badge>} />
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Dropzone label="Cámara de Comercio" helper="PDF o imágenes." accept=".pdf,image/*" disabled={disabled}
            value={watch("docsChamber") || []} onChange={(v)=>setValue("docsChamber", v, { shouldDirty:true, shouldValidate:true })} />
          <Dropzone label="RUT" helper="PDF o imágenes." accept=".pdf,image/*" disabled={disabled}
            value={watch("docsRUT") || []} onChange={(v)=>setValue("docsRUT", v, { shouldDirty:true, shouldValidate:true })} />
          <Dropzone label="Proyecto de etiqueta" helper="Artes / renders / PDF." accept=".pdf,image/*" disabled={disabled}
            value={watch("docsLabelArt") || []} onChange={(v)=>setValue("docsLabelArt", v, { shouldDirty:true, shouldValidate:true })} />
          <Dropzone label="Ficha Técnica" helper="PDF / Word / imágenes." accept=".pdf,.doc,.docx,image/*" disabled={disabled}
            value={watch("docsTechSheet") || []} onChange={(v)=>setValue("docsTechSheet", v, { shouldDirty:true, shouldValidate:true })} />
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
          <div><Label>Material</Label><Input disabled={disabled} {...register("packaging.material")} placeholder="Ej: PET / PP / PEAD / Airless" /></div>
          <div><Label>Presentación</Label><Input disabled={disabled} {...register("packaging.presentation")} placeholder="Ej: 120 mL, 250 mL, 1 kg" /></div>
          <div><Label>Cierre / Tapa</Label><Input disabled={disabled} {...register("packaging.closure")} placeholder="Ej: Flip-top, bomba, spray" /></div>
          <div><Label>Capacidad</Label><Input disabled={disabled} {...register("packaging.capacity")} placeholder="Ej: 100 mL" /></div>
          <div className="md:col-span-2"><Label>Notas de compatibilidad</Label><Textarea disabled={disabled} {...register("packaging.compatibilityNotes")} placeholder="Compatibilidad envase-formulación, migración, estrés…" /></div>
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
