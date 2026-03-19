import React from "react";
import { Button } from "./primitives.jsx";

export default function ModuleTabs({ items, activeId, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <Button
          key={it.id}
          type="button"
          variant={it.id === activeId ? "default" : "outline"}
          onClick={() => onChange(it.id)}
          className="h-9"
        >
          {it.label}
        </Button>
      ))}
    </div>
  );
}
