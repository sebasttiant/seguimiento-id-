import React, { useId, useMemo, useState } from 'react';
import Dropzone from '../../../shared/ui/Dropzone.jsx';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Textarea,
} from '../../../shared/ui/primitives.jsx';

const CATEGORY_OPTIONS = [
  { value: 'COSMETICOS', label: 'Cosméticos' },
  { value: 'VETERINARIOS', label: 'Veterinarios' },
  { value: 'ALIMENTOS', label: 'Alimentos' },
];

function pick(v, fallback = '') {
  return v === null || v === undefined ? fallback : v;
}

// ✅ Acordeón simple
function AccordionRow({ title, subtitle, open, onToggle, right, children }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white'>
      <div className='flex items-center justify-between gap-3 px-4 py-3'>
        <div
          className='min-w-0 flex-1 cursor-pointer select-none'
          role='button'
          tabIndex={0}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onToggle();
          }}
        >
          <div className='text-sm font-semibold text-slate-900'>{title}</div>
          {subtitle ? <div className='mt-0.5 text-xs text-slate-500'>{subtitle}</div> : null}
        </div>

        <div className='flex items-center gap-2'>
          {right}
          <button
            type='button'
            onClick={onToggle}
            className='rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50'
            title={open ? 'Cerrar' : 'Abrir'}
            aria-label={open ? 'Cerrar' : 'Abrir'}
          >
            {open ? '▾' : '▸'}
          </button>
        </div>
      </div>

      {open ? <div className='border-t border-slate-100 px-4 py-4'>{children}</div> : null}
    </div>
  );
}

export default function ClientBriefModule({ project, canEdit, onSave, onLoadReferenceImage }) {
  const disabled = !canEdit;
  const fieldId = useId();

  const initial = useMemo(() => {
    const cb = project?.clientBrief || {};
    return {
      clientName: pick(cb.clientName, ''),
      nit: pick(cb.nit, ''),
      productName: pick(cb.productName, ''),
      brand: pick(cb.brand, ''),
      contactName: pick(cb.contactName, ''),
      contactEmail: pick(cb.contactEmail, ''),
      contactPhone: pick(cb.contactPhone, ''),
      category: pick(cb.category, 'COSMETICOS'),
      categoryOther: pick(cb.categoryOther, ''),
      referenceImage: pick(cb.referenceImage, null) || (Array.isArray(cb.referenceImages) ? cb.referenceImages[0] || null : null),
      requirements: Array.isArray(cb.requirements) ? cb.requirements : [],
    };
  }, [project]);

  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);

  const [openReqIndex, setOpenReqIndex] = useState(null);

  React.useEffect(() => {
    setForm(initial);
    setDirty(false);
    setOpenReqIndex(null); // ✅ al cambiar de proyecto, todo cerrado
  }, [initial]);

  const categoryLabel = useMemo(() => {
    const found = CATEGORY_OPTIONS.find((x) => x.value === form.category);
    return found ? found.label : '—';
  }, [form.category]);

  function setField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
    setDirty(true);
  }

  function addRequirement() {
    const n = (form.requirements?.length || 0) + 1;
    const next = [...(form.requirements || []), { title: `Requerimiento ${n}`, notes: '' }];
    setField('requirements', next);
    setOpenReqIndex(next.length - 1); // ✅ abre el nuevo
  }

  function updateRequirement(idx, patch) {
    const next = [...(form.requirements || [])];
    next[idx] = { ...next[idx], ...patch };
    setField('requirements', next);
  }

  function removeRequirement(idx) {
    const next = [...(form.requirements || [])];
    next.splice(idx, 1);
    setField('requirements', next);

    // ✅ Ajuste del acordeón si borras
    setOpenReqIndex((prev) => {
      if (prev === null) return null;
      if (prev === idx) return null;
      if (prev > idx) return prev - 1;
      return prev;
    });
  }

  return (
    <div className='grid gap-4'>
      <Card>
        <CardHeader
          title='Cliente y Brief'
          subtitle='Datos del cliente + clasificación + referencia del producto.'
          right={<Badge tone={dirty ? 'warn' : 'neutral'}>{dirty ? 'Cambios sin guardar' : 'Sin cambios'}</Badge>}
        />
        <CardContent>
          <div className='grid gap-4'>
            {/* Datos base */}
            <div className='grid gap-3 md:grid-cols-12'>
              <div className='md:col-span-6'>
                <Label htmlFor={`${fieldId}-clientName`}>Cliente *</Label>
                <Input
                  id={`${fieldId}-clientName`}
                  disabled={disabled}
                  value={form.clientName}
                  onChange={(e) => setField('clientName', e.target.value)}
                />
              </div>

              <div className='md:col-span-6'>
                <Label htmlFor={`${fieldId}-nit`}>NIT</Label>
                <Input id={`${fieldId}-nit`} disabled={disabled} value={form.nit} onChange={(e) => setField('nit', e.target.value)} />
              </div>

              <div className='md:col-span-6'>
                <Label htmlFor={`${fieldId}-brand`}>Marca *</Label>
                <Input id={`${fieldId}-brand`} disabled={disabled} value={form.brand} onChange={(e) => setField('brand', e.target.value)} />
              </div>

              <div className='md:col-span-6'>
                <Label htmlFor={`${fieldId}-productName`}>Producto / Desarrollo</Label>
                <Input
                  id={`${fieldId}-productName`}
                  disabled={disabled}
                  value={form.productName}
                  onChange={(e) => setField('productName', e.target.value)}
                />
              </div>

              <div className='md:col-span-6'>
                <Label htmlFor={`${fieldId}-contactName`}>Contacto *</Label>
                <Input
                  id={`${fieldId}-contactName`}
                  disabled={disabled}
                  value={form.contactName}
                  onChange={(e) => setField('contactName', e.target.value)}
                />
              </div>

              <div className='md:col-span-6'>
                <Label htmlFor={`${fieldId}-contactEmail`}>Email</Label>
                <Input
                  id={`${fieldId}-contactEmail`}
                  type='email'
                  disabled={disabled}
                  value={form.contactEmail}
                  onChange={(e) => setField('contactEmail', e.target.value)}
                />
              </div>

              <div className='md:col-span-6'>
                <Label htmlFor={`${fieldId}-contactPhone`}>Telefono</Label>
                <Input
                  id={`${fieldId}-contactPhone`}
                  disabled={disabled}
                  value={form.contactPhone}
                  onChange={(e) => setField('contactPhone', e.target.value)}
                />
              </div>
            </div>

            {/* Clasificación */}
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                  <div className='text-sm font-semibold text-slate-900'>Clasificación del desarrollo</div>
                  <div className='mt-0.5 text-xs text-slate-500'>
                    Esta categoría se mostrará también en el Dashboard.
                  </div>
                </div>
                <Badge tone='info'>{categoryLabel}</Badge>
              </div>

              <div className='mt-3 grid gap-3 md:grid-cols-12'>
                <div className='md:col-span-6'>
                  <Label htmlFor={`${fieldId}-category`}>Categoria</Label>
                  <select
                    id={`${fieldId}-category`}
                    disabled={disabled}
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value)}
                    className='h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200'
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {form.category === 'OTROS' ? (
                  <div className='md:col-span-6'>
                    <Label>Especificar</Label>
                    <Input
                      disabled={disabled}
                      value={form.categoryOther}
                      onChange={(e) => setField('categoryOther', e.target.value)}
                      placeholder='Ej: industrial, veterinario...'
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Referencia visual */}
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <div className='text-sm font-semibold text-slate-900'>Producto de referencia (imagen)</div>
              <div className='mt-0.5 text-xs text-slate-500'>
                Adjunta una imagen del producto que el cliente trae como referencia.
              </div>
              <div className='mt-3'>
                <Dropzone
                  label='Imagen de referencia'
                  helper='Arrastra la imagen aquí o usa el botón "Adjuntar".'
                  accept='image/*'
                  disabled={disabled}
                  value={form.referenceImage ? [form.referenceImage] : []}
                  onChange={(files) => setField('referenceImage', files[0] || null)}
                  onLoadFileContent={onLoadReferenceImage}
                />
              </div>
            </div>

            {/* ✅ Requerimientos en acordeón */}
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <div className='flex items-center justify-between gap-2'>
                <div>
                  <div className='text-sm font-semibold text-slate-900'>Requerimientos (reuniones)</div>
                  <div className='mt-0.5 text-xs text-slate-500'>
                    Quedan cerrados por defecto. Abre uno para tomar notas.
                  </div>
                </div>

                <Button type='button' className='h-9' disabled={disabled} onClick={addRequirement}>
                  + Agregar requerimiento
                </Button>
              </div>

              <div className='mt-4 grid gap-3'>
                {(form.requirements || []).length === 0 ? (
                  <div className='rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600'>
                    Aún no hay requerimientos. Usa <span className='font-medium'>Agregar requerimiento</span>.
                  </div>
                ) : null}

                {(form.requirements || []).map((r, idx) => {
                  const open = openReqIndex === idx;
                  const subtitle = (r.notes || '').trim()
                    ? `Notas: ${(r.notes || '').trim().slice(0, 60)}${(r.notes || '').trim().length > 60 ? '…' : ''}`
                    : 'Sin notas';

                  return (
                    <AccordionRow
                      key={`${r.title}_${idx}`}
                      title={r.title || `Requerimiento ${idx + 1}`}
                      subtitle={subtitle}
                      open={open}
                      onToggle={() => setOpenReqIndex(open ? null : idx)}
                      right={
                        <Button
                          type='button'
                          variant='outline'
                          className='h-8 px-3 text-xs'
                          disabled={disabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRequirement(idx);
                          }}
                        >
                          Eliminar
                        </Button>
                      }
                    >
                      <div className='grid gap-3 md:grid-cols-12'>
                        <div className='md:col-span-6'>
                          <Label>Título</Label>
                          <Input
                            disabled={disabled}
                            value={r.title || ''}
                            onChange={(e) => updateRequirement(idx, { title: e.target.value })}
                          />
                        </div>

                        <div className='md:col-span-12'>
                          <Label>Notas</Label>
                          <Textarea
                            disabled={disabled}
                            value={r.notes || ''}
                            onChange={(e) => updateRequirement(idx, { notes: e.target.value })}
                            placeholder='Notas de la reunión...'
                          />
                        </div>
                      </div>
                    </AccordionRow>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title='Acciones' subtitle={disabled ? 'Vista lectura' : 'Guarda el módulo de Cliente y Brief'} />
        <CardContent className='flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            disabled={disabled || !dirty}
            onClick={() => {
              setForm(initial);
              setDirty(false);
              setOpenReqIndex(null);
            }}
          >
            Descartar
          </Button>
          <Button
            type='button'
            disabled={disabled}
            onClick={() => {
              onSave(form);
              setDirty(false);
            }}
          >
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
