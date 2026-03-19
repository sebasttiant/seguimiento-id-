import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, Badge, Input } from "../../../shared/ui/primitives.jsx";

function formatDateCO(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function statusLabelForRow(row) {
  if (row.isApproved) return { label: "Aprobado", tone: "good" };
  if (row.approvedAt) return { label: "Aprobación registrada", tone: "good" };
  return { label: "Iteración", tone: "info" };
}

export default function ChangesModule({ project }) {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const raw = project?.samples?.items || project?.samples || [];
    const arr = Array.isArray(raw) ? raw : (raw?.items || []);

    const approved = arr.find((s) => s?.kind === "approved");
    const approvedFromCode = approved?.approvedFromCode || "";

    const all = arr
      .filter((s) => (s?.kind === "extra" || s?.kind === "pilot") && (s?.changeSummary || s?.parentCode))
      .map((s) => {
        const dateGuess = s?.approvedAt || s?.madeAt || s?.deliveryAt || s?.updatedAt || "";
        return {
          batchCode: s?.batchCode || "",
          parentCode: s?.parentCode || "",
          description: s?.changeSummary || "Iteración creada",
          madeAt: s?.madeAt || "",
          approvedAt: s?.approvedAt || "",
          deliveryAt: s?.deliveryAt || "",
          date: dateGuess,
          isApproved: approvedFromCode && s?.batchCode === approvedFromCode,
        };
      });

    const parseN = (code) => {
      const m = String(code || "").match(/-(\d+)$/);
      return m ? Number(m[1]) : null;
    };
    all.sort((a, b) => {
      const an = parseN(a.batchCode);
      const bn = parseN(b.batchCode);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return String(b.date).localeCompare(String(a.date));
    });

    const qq = q.trim().toLowerCase();
    if (!qq) return all;

    return all.filter((r) => {
      const hay = `${r.batchCode} ${r.parentCode} ${r.description}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [project, q]);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader
          title="Control de Cambios"
          subtitle="Historial consolidado (iteraciones creadas en Muestras)."
          right={<Badge tone={rows.length ? "info" : "neutral"}>{rows.length} cambios</Badge>}
        />
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="w-full md:w-[420px]">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por lote (0001-2026-2), origen (0001-2026-1) o descripción..."
              />
            </div>
            <div className="text-xs text-slate-500">
              Tip: escribe el lote aprobado o cualquier iteración para filtrar al vuelo.
            </div>
          </div>

          {!rows.length ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No hay cambios registrados aún. (Crea iteraciones con <span className="font-medium">Adicionar cambio</span> en Muestras.)
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Iteración</th>
                    <th className="px-4 py-3 text-left font-medium">Origen</th>
                    <th className="px-4 py-3 text-left font-medium">Descripción</th>
                    <th className="px-4 py-3 text-left font-medium">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((r, idx) => {
                    const meta = statusLabelForRow(r);
                    return (
                      <tr key={`${r.batchCode || "row"}_${idx}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-900">
                          {r.batchCode || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                          {r.parentCode || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          {r.description}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                          {formatDateCO(r.date)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
