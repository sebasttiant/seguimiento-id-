import React from 'react';

export default function ModuleStepper({ items, activeIndex, onChange }) {
  return (
    <div className='w-full'>
      {/* 
        - Mobile: 1 columna
        - sm: 2 columnas
        - lg: 3 columnas (perfecto para 6 pasos -> 2 filas de 3)
      */}
      <ol className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {items.map((it, idx) => {
          const isActive = idx === activeIndex;
          const isDone = idx < activeIndex;

          return (
            <li key={it.id} className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => onChange(idx)}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Paso ${idx + 1}: ${it.label}`}
                className={[
                  'w-full flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition',
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid h-6 w-6 place-items-center rounded-full text-xs font-semibold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-700',
                  ].join(' ')}
                >
                  {idx + 1}
                </span>

                <span className='truncate'>{it.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
