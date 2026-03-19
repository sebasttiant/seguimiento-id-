import React from "react";
import { toErrorMessage } from "../lib/errorUtils.js";

export default function QueryState({ isLoading, error, isEmpty, emptyMessage, children }) {
  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Cargando...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700" role="alert">
        {toErrorMessage(error, "No se pudo cargar la informacion")}
      </div>
    );
  }

  if (isEmpty) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">{emptyMessage}</div>;
  }

  return children;
}
