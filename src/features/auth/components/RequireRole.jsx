import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireRole({ allowedRoles = [] }) {
  const { currentUser, hasRole, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <div className="p-4 text-sm text-slate-600">Validando permisos...</div>;
  }

  if (!currentUser || !hasRole(allowedRoles)) {
    return <Navigate to="/forbidden" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
