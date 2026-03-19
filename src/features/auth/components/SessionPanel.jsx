import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABELS } from "../data/mockUsers.js";
import { Badge, Button } from "../../../shared/ui/primitives.jsx";

export default function SessionPanel({ compact = false }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  if (!currentUser) return null;

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "rounded-2xl border border-slate-200 bg-white p-3"}>
      <div className={compact ? "text-xs text-slate-600" : "text-sm text-slate-600"}>
        <span className="font-medium text-slate-900">Sesión activa</span>
      </div>
      <Badge tone="info">{ROLE_LABELS[currentUser.role] || currentUser.role}</Badge>
      <Button
        type="button"
        variant="outline"
        className="h-8"
        onClick={async () => {
          await logout();
          navigate("/login", { replace: true });
        }}
      >
        Cerrar sesión
      </Button>
    </div>
  );
}
