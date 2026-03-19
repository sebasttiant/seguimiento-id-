import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import QueryState from "../../shared/ui/QueryState.jsx";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
} from "../../shared/ui/primitives.jsx";
import RoleRestrictionNotice from "../../shared/ui/RoleRestrictionNotice.jsx";
import SessionPanel from "../auth/components/SessionPanel.jsx";
import { useAuth } from "../auth/context/AuthContext.jsx";
import { loadDashboardFilters, saveDashboardFilters } from "./lib/dashboardFiltersSession.js";
import { getDashboardActions, getProjectDisplayCode } from "./lib/dashboardActions.js";
import { useCreateProject, useProjectSummaries } from "../project/data/projectHooks.js";

function statusMeta(code) {
  switch (code) {
    case "APROBADO":
      return { label: "Aprobado", tone: "good" };
    case "EN_PROCESO":
      return { label: "En Proceso", tone: "info" };
    case "PENDIENTE":
    default:
      return { label: "Pendiente", tone: "warn" };
  }
}

function typeMeta(type) {
  switch ((type || "").toUpperCase()) {
    case "ALIMENTOS":
      return { label: "Alimentos", tone: "neutral" };
    case "VETERINARIOS":
      return { label: "Veterinarios", tone: "neutral" };
    case "COSMETICOS":
    case "COSMÉTICOS":
      return { label: "Cosméticos", tone: "neutral" };
    default:
      return { label: "—", tone: "neutral" };
  }
}

function safeText(v) {
  return v && String(v).trim() ? String(v) : "—";
}

export default function DashboardPage() {
  const nav = useNavigate();
  const { currentUser, hasRole } = useAuth();
  const createProject = useCreateProject();
  const initialFilters = useMemo(() => loadDashboardFilters(currentUser), [currentUser]);
  const [q, setQ] = useState(initialFilters.q);
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter);
  const [operationStatus, setOperationStatus] = useState(null);
  const canEditProjects = hasRole(["admin", "editor"]);
  const dashboardActions = getDashboardActions(canEditProjects);

  const { data = [], isLoading, error } = useProjectSummaries();

  useEffect(() => {
    setQ(initialFilters.q);
    setStatusFilter(initialFilters.statusFilter);
  }, [initialFilters]);

  useEffect(() => {
    saveDashboardFilters(currentUser, { q, statusFilter });
  }, [currentUser, q, statusFilter]);

  const normalizedRows = useMemo(
    () =>
      (data || []).map((r) => ({
        id: r.id,
        consecutive: r.consecutive ?? "",
        clientName: r.clientName ?? r.client ?? r.cliente ?? "",
        nit: r.nit ?? "",
        productName: r.productName ?? r.product ?? r.producto ?? "",
        type: r.type ?? r.category ?? "",
        statusCode: r.statusCode ?? r.status ?? r.estado ?? "PENDIENTE",
        updatedAt: r.updatedAt ?? "",
      })),
    [data]
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return normalizedRows
      .filter((r) => {
        if (statusFilter === "ALL") return true;
        return (r.statusCode || "PENDIENTE") === statusFilter;
      })
      .filter((r) => {
        if (!query) return true;
        return (
          (r.consecutive || "").toLowerCase().includes(query) ||
          (r.id || "").toLowerCase().includes(query) ||
          (r.nit || "").toLowerCase().includes(query) ||
          (r.clientName || "").toLowerCase().includes(query)
        );
      });
  }, [normalizedRows, q, statusFilter]);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <SessionPanel />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Proyectos I+D</h1>
          <p className="mt-1 text-sm text-slate-600">
            Bandeja de consulta · Busca por NIT, Cliente o Consecutivo.
          </p>
        </div>

        <Button
          type="button"
          disabled={!canEditProjects || createProject.isPending}
          onClick={async () => {
            if (!canEditProjects) return;
            try {
              setOperationStatus({ tone: "neutral", message: "Creando proyecto..." });
              const p = await createProject.mutateAsync({});
              const projectLabel = p.consecutive || p.id;
              setOperationStatus({ tone: "good", message: `Proyecto ${projectLabel} creado correctamente.` });
              nav(`/projects/${p.id}?mode=edit`, {
                state: {
                  flash: {
                    tone: "good",
                    title: `Proyecto ${projectLabel} creado`,
                    detail: "Ya puedes completar los modulos del proyecto.",
                  },
                },
              });
            } catch (createError) {
              const detail =
                createError instanceof Error ? createError.message : "No fue posible crear el proyecto. Intenta nuevamente.";
              setOperationStatus({ tone: "bad", message: detail });
            }
          }}
        >
          {createProject.isPending ? "Creando..." : "+ Nuevo Proyecto"}
        </Button>
      </div>

      {operationStatus ? (
        <p
          className={[
            "mt-3 rounded-xl border px-3 py-2 text-sm",
            operationStatus.tone === "good"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : operationStatus.tone === "bad"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : "border-slate-200 bg-slate-50 text-slate-700",
          ].join(" ")}
          role="status"
          aria-live="polite"
        >
          {operationStatus.message}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4">
        <Card>
          <CardHeader
            title="Buscador principal"
            subtitle="Filtra escribiendo el consecutivo, el NIT o el nombre del cliente."
            right={<Badge tone="neutral">{filtered.length} resultados</Badge>}
          />
          <CardContent>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-xl">
                <label htmlFor="dashboard-search" className="sr-only">
                  Buscar proyecto por consecutivo, NIT o cliente
                </label>
                <Input
                  id="dashboard-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por 0001-2026 / NIT / Cliente..."
                  aria-label="Buscar proyecto"
                />
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
                <Button
                  type="button"
                  variant={statusFilter === "ALL" ? "default" : "outline"}
                  className="h-9"
                  onClick={() => setStatusFilter("ALL")}
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  variant={statusFilter === "EN_PROCESO" ? "default" : "outline"}
                  className="h-9"
                  onClick={() => setStatusFilter("EN_PROCESO")}
                >
                  En Proceso
                </Button>
                <Button
                  type="button"
                  variant={statusFilter === "PENDIENTE" ? "default" : "outline"}
                  className="h-9"
                  onClick={() => setStatusFilter("PENDIENTE")}
                >
                  Pendiente
                </Button>
                <Button
                  type="button"
                  variant={statusFilter === "APROBADO" ? "default" : "outline"}
                  className="h-9"
                  onClick={() => setStatusFilter("APROBADO")}
                >
                  Aprobado
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Resultados" subtitle="Listado por consecutivo" />
          <CardContent>
            <QueryState
              isLoading={isLoading}
              error={error}
              isEmpty={!isLoading && filtered.length === 0}
              emptyMessage="No hay resultados con ese filtro."
            >
              <div className="md:hidden space-y-3">
                {filtered.map((r) => {
                  const meta = statusMeta(r.statusCode);
                  const t = typeMeta(r.type);
                  return (
                    <article key={r.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-900">{safeText(getProjectDisplayCode(r))}</h3>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{safeText(r.clientName)}</p>
                      <p className="text-xs text-slate-500">NIT: {safeText(r.nit)}</p>
                      <p className="mt-1 text-xs text-slate-500">Producto: {safeText(r.productName)}</p>
                      <div className="mt-2">
                        <Badge tone={t.tone}>{t.label}</Badge>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 flex-1"
                          disabled={!dashboardActions.canView}
                          onClick={() => nav(`/projects/${r.id}?mode=view`)}
                        >
                          Ver
                        </Button>
                        <Button
                          type="button"
                          className="h-9 flex-1"
                          disabled={!dashboardActions.canEdit}
                          title={!dashboardActions.canEdit ? "Sin permisos de edicion" : undefined}
                          onClick={() => nav(`/projects/${r.id}?mode=edit`)}
                        >
                          Editar
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">ID / Consecutivo</th>
                      <th className="px-4 py-3 text-left font-medium">Cliente</th>
                      <th className="px-4 py-3 text-left font-medium">NIT</th>
                      <th className="px-4 py-3 text-left font-medium">Producto</th>
                      <th className="px-4 py-3 text-left font-medium">Tipo</th>
                      <th className="px-4 py-3 text-left font-medium">Estado</th>
                      <th className="px-4 py-3 text-right font-medium">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const meta = statusMeta(r.statusCode);
                      const t = typeMeta(r.type);
                      return (
                        <tr key={r.id} className="border-t border-slate-100">
                          <td className="px-4 py-4 font-semibold text-slate-900">{safeText(getProjectDisplayCode(r))}</td>
                          <td className="px-4 py-4 text-slate-900">{safeText(r.clientName)}</td>
                          <td className="px-4 py-4 text-slate-900">{safeText(r.nit)}</td>
                          <td className="px-4 py-4 text-slate-900">{safeText(r.productName)}</td>
                          <td className="px-4 py-4">
                            <Badge tone={t.tone}>{t.label}</Badge>
                          </td>
                          <td className="px-4 py-4">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={!dashboardActions.canView}
                                onClick={() => nav(`/projects/${r.id}?mode=view`)}
                              >
                                Ver
                              </Button>
                              <Button
                                type="button"
                                disabled={!dashboardActions.canEdit}
                                title={!dashboardActions.canEdit ? "Sin permisos de edicion" : undefined}
                                onClick={() => nav(`/projects/${r.id}?mode=edit`)}
                              >
                                Editar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </QueryState>

            {!canEditProjects ? <RoleRestrictionNotice className="mt-3" /> : null}

            <p className="mt-3 text-xs text-slate-500">
              Tip: escribe el consecutivo, el NIT completo o una palabra del cliente para filtrar al vuelo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
