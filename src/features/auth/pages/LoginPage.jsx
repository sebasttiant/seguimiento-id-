import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABELS } from "../data/mockUsers.js";
import { Button, Input, Label, Select } from "../../../shared/ui/primitives.jsx";

const ROLE_OPTIONS = ["admin", "editor", "viewer"];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, authMode } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState({ tone: "neutral", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  const fromPath = location.state?.from?.pathname;
  const redirectTo = fromPath && fromPath !== "/login" ? fromPath : "/dashboard";

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4">
      <div className="mx-auto grid min-h-[90vh] w-full max-w-4xl items-center gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-cyan-100 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">Seguimiento I+D</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Accede a tu entorno de gestión I+D</h1>
          <p className="mt-3 text-sm text-slate-600">
            {authMode === "mock"
              ? "Modo de demostración activo para pruebas internas de la plataforma."
              : "Centraliza el avance de proyectos, hitos técnicos y control regulatorio."}
          </p>

          <ul className="mt-6 space-y-2 text-sm text-slate-700">
            <li>Administrador: visión integral del portafolio, operación y cumplimiento.</li>
            <li>Editor: actualización de avances, entregables técnicos y estado regulatorio.</li>
            <li>Lector: consulta de proyectos, indicadores y evidencias sin edición.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-500">
            Usa tu usuario (admin, editor o viewer) y contraseña.
          </p>

          <form
            className="mt-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsLoading(true);
              setStatus({ tone: "neutral", message: "Validando credenciales..." });

              try {
                await login({ identifier, password, role: role || undefined });
                setStatus({ tone: "good", message: "Ingreso exitoso. Redirigiendo..." });
                navigate(redirectTo, { replace: true });
              } catch (error) {
                setStatus({
                  tone: "bad",
                  message: error instanceof Error ? error.message : "No fue posible iniciar sesión.",
                });
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <div>
              <Label htmlFor="identifier">Usuario o correo</Label>
              <Input
                id="identifier"
                value={identifier}
                autoComplete="username"
                placeholder="admin"
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                placeholder="********"
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {authMode === "mock" ? (
              <div>
                <Label htmlFor="role">Rol esperado (opcional)</Label>
                <Select id="role" value={role} onChange={(event) => setRole(event.target.value)}>
                  <option value="">Detectar automáticamente</option>
                  {ROLE_OPTIONS.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {ROLE_LABELS[roleOption]}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {status.message ? (
              <p
                className={[
                  "rounded-xl border px-3 py-2 text-sm",
                  status.tone === "good"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : status.tone === "bad"
                    ? "border-rose-200 bg-rose-50 text-rose-900"
                    : "border-slate-200 bg-slate-50 text-slate-700",
                ].join(" ")}
                role="status"
                aria-live="polite"
              >
                {status.message}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Ingresando..." : "Entrar"}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
