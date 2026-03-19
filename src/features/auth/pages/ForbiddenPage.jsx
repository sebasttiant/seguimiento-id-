import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../shared/ui/primitives.jsx";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-4">
      <section className="w-full rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Acceso restringido</p>
        <h1 className="mt-3 text-2xl font-semibold text-amber-900">No tienes permisos para esta sección</h1>
        <p className="mt-2 text-sm text-amber-800">Solicita permisos de Editor o Administrador para continuar.</p>
        <Link to="/dashboard" className="mt-6 inline-block">
          <Button type="button">Volver al dashboard</Button>
        </Link>
      </section>
    </main>
  );
}
