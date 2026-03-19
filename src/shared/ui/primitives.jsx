
import React from "react";

export const Button = React.forwardRef(function Button(
  { className = "", variant = "default", ...props },
  ref
) {
  const base =
    "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    outline: "border border-slate-300 text-slate-900 hover:bg-slate-50",
    ghost: "text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      ref={ref}
      {...props}
      className={`${base} ${variants[variant] || ""} ${className}`}
    />
  );
});

export const Input = React.forwardRef(function Input(
  { className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 ${className}`}
    />
  );
});

export const Textarea = React.forwardRef(function Textarea(
  { className = "", ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 ${className}`}
    />
  );
});

export const Select = React.forwardRef(function Select(
  { className = "", children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 ${className}`}
    >
      {children}
    </select>
  );
});

export function Card({ className = "", ...props }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white ${className}`} {...props} />;
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function CardContent({ className = "", ...props }) {
  return <div className={`px-5 py-4 ${className}`} {...props} />;
}

export function Label({ className = "", ...props }) {
  return <label className={`mb-1 block text-xs font-medium text-slate-700 ${className}`} {...props} />;
}

export function Badge({ tone = "neutral", children }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    good: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-700",
    bad: "bg-rose-100 text-rose-700",
    info: "bg-blue-100 text-blue-700",
  };
  return <span className={`rounded-full px-3 py-1 text-xs ${tones[tone]}`}>{children}</span>;
}
