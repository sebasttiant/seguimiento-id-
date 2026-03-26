import { z } from "zod";

const email = z.string().email("Email inválido").optional();
const phone = z.string().optional();

/* =========================
   CLIENTE Y BRIEF (+ Pre-Brief en el mismo objeto)
========================= */

export const clientBriefSchema = z.object({
  clientName: z.string().min(1, "Requerido"),
  nit: z.string().optional(),
  productName: z.string().optional(),
  brand: z.string().min(1, "Requerido"),
  contactName: z.string().min(1, "Requerido"),
  contactEmail: email,
  contactPhone: phone,

  // ✅ Categoría + referencia del cliente
  category: z
    .enum([
      "ALIMENTOS",
      "CAPILAR",
      "ROSTRO",
      "CORPORAL",
      "SOLAR",
      "INTIMO",
      "FRAGANCIAS",
      "HOGAR",
      "OTROS",
    ])
    .default("CAPILAR"),
  categoryOther: z.string().optional(),
  referenceImage: z.any().nullable().default(null),
  referenceImages: z.array(z.any()).max(5, "Máximo 5 imágenes de referencia").default([]),

  // ✅ Módulo 0 - Pre-Brief (calificación del lead)
  leadStatus: z.enum(["PENDIENTE", "CALIFICADO", "DESCARTADO"]).default("PENDIENTE"),
  leadBudgetRange: z.string().optional(),
  leadTargetDate: z.string().optional(),
  leadNotes: z.string().optional(),

  requirements: z
    .array(
      z.object({
        title: z.string().min(1, "Requerido"),
        notes: z.string().optional(),
      })
    )
    .default([]),
});

/* =========================
   ESPECIFICACIONES
========================= */

export const techSpecsSchema = z.object({
  phMin: z.number().nullable().default(null),
  phMax: z.number().nullable().default(null),
  phCurrent: z.number().nullable().default(null),

  sensoryColor: z.string().optional(),
  sensoryOdor: z.string().optional(),
  sensoryTexture: z.string().optional(),
  requestedIngredients: z.array(z.string()).default([]),

  viscosity: z.number().nullable().default(null),
  viscosityUnit: z.enum(["cP", "mPa·s", "Pa·s"]).default("cP"),
  torque: z.number().nullable().default(null),
  rpm: z.number().nullable().default(null),
  needleType: z.string().default("Spindle #1"),

  density: z.number().nullable().default(null),
  densityUnit: z.enum(["g/mL", "kg/m³"]).default("g/mL"),
});

/* =========================
   MUESTRAS / ITERACIONES REALES
========================= */

export const sampleItemSchema = z.object({
  id: z.string(),
  kind: z.enum(["dev", "extra", "approved", "pilot"]).default("extra"),
  title: z.string(),

  batchCode: z.string().optional(),
  madeAt: z.string().optional(),
  approvedAt: z.string().optional(),
  deliveryAt: z.string().optional(),

  photos: z.array(z.any()).default([]),
  notes: z.string().optional(),

  parentId: z.string().optional(),
  parentCode: z.string().optional(),
  changeSummary: z.string().optional(),

  approvedFromId: z.string().optional(),
  approvedFromCode: z.string().optional(),
  approvedFromTitle: z.string().optional(),
});

export const samplesSchema = z.object({
  items: z.array(sampleItemSchema).default([]),
});

/* =========================
   CALIDAD / REGULATORIO
========================= */

export const qualityRegSchema = z.object({
  chamberOfCommerceFiles: z.array(z.any()).default([]),
  rutFiles: z.array(z.any()).default([]),
  labelProjectFiles: z.array(z.any()).default([]),
  technicalSheetsFiles: z.array(z.any()).default([]),

  transportTests: z.string().optional(),
  packagingCharacteristics: z.string().optional(),
});

/* =========================
   CONTROL DE CAMBIOS (legacy)
========================= */

export const changeItemSchema = z.object({
  no: z.number().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  owner: z.string().optional(),
});

export const changesSchema = z.object({
  items: z.array(changeItemSchema).default([]),
});
