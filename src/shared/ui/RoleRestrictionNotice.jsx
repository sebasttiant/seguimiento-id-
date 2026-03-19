import React from "react";
import { getProjectWriteRestrictionMessage } from "../lib/rolePermissions.js";

export default function RoleRestrictionNotice({ message = getProjectWriteRestrictionMessage(), className = "" }) {
  return (
    <p className={["rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800", className].join(" ")}>
      {message}
    </p>
  );
}
