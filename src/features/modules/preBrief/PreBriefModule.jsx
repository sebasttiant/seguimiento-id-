import React, { useEffect, useId, useMemo, useState } from 'react';
import Dropzone from '../../../shared/ui/Dropzone.jsx';
import { Badge, Button, Card, CardContent, CardHeader, Input, Label } from '../../../shared/ui/primitives.jsx';

const CATEGORY_OPTIONS = [
  { value: 'COSMETICOS', label: 'Cosméticos' },
  { value: 'VETERINARIOS', label: 'Veterinarios' },
  { value: 'ALIMENTOS', label: 'Alimentos' },
];

function leadMeta(status) {
  switch (status) {
    case 'CALIFICADO':
      return { label: 'Calificado', tone: 'good' };
    case 'DESCARTADO':
      return { label: 'Descartado', tone: 'bad' };
    case 'PENDIENTE':
    default:
      return { label: 'Pendiente', tone: 'warn' };
  }
}

export default function PreBriefModule({ project, canEdit, onSave }) {
  const disabled = !canEdit;
  const fieldId = useId();

  const initial = useMemo(() => {
    const cb = project?.clientBrief || {};
    return {
      clientName: cb.clientName || '',
      nit: cb.nit || '',
      productName: cb.productName || '',
      brand: cb.brand || '',
      contactName: cb.contactName || '',
      contactEmail: cb.contactEmail || '',
      contactPhone: cb.contactPhone || '',

      category: cb.category || 'COSMETICOS',
      categoryOther: cb.categoryOther || '',
      referenceImage: cb.referenceImage || (Array.isArray(cb.referenceImages) ? cb.referenceImages[0] || null : null),

      leadTargetDate: cb.leadTargetDate || '',
      leadStatus: cb.leadStatus || 'PENDIENTE',
    };
  }, [project]);

  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm(initial);
    setDirty(false);
  }, [initial]);

  const meta = leadMeta(form.leadStatus);

  function setField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
    setDirty(true);
  }

  return (
    <div className='grid gap-4'>
      <Card>
        <CardHeader
          title='Contacto inicial'
          subtitle='Gate 0: califica el lead antes de continuar al módulo Cliente.'
          right={
            <div className='flex items-center gap-2'>
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {dirty ? <Badge tone='warn'>Cambios sin guardar</Badge> : <Badge tone='neutral'>Sin cambios</Badge>}
            </div>
          }
        />
        <CardContent>
          {/* Acciones de aprobación */}
          <div className='mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3'>
            <div className='text-sm text-slate-700'>
              Estado del lead: <span className='font-medium'>{meta.label}</span>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                className='h-9'
                disabled={disabled}
                onClick={() => setField('leadStatus', 'DESCARTADO')}
              >
                Descartar
              </Button>

              <Button
                type='button'
                className='h-9'
                disabled={disabled}
                onClick={() => setField('leadStatus', 'CALIFICADO')}
              >
                Aprobar
              </Button>
            </div>
          </div>

          {/* Campos */}
          <div className='grid gap-3 md:grid-cols-12'>
            <div className='md:col-span-6'>
              <Label htmlFor={`${fieldId}-clientName`}>Cliente / Empresa</Label>
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
              <Label htmlFor={`${fieldId}-brand`}>Marca</Label>
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
              <Label htmlFor={`${fieldId}-contactName`}>Contacto</Label>
              <Input
                id={`${fieldId}-contactName`}
                disabled={disabled}
                value={form.contactName}
                onChange={(e) => setField('contactName', e.target.value)}
              />
            </div>
            <div className='md:col-span-3'>
              <Label htmlFor={`${fieldId}-contactEmail`}>Email</Label>
              <Input
                id={`${fieldId}-contactEmail`}
                type='email'
                disabled={disabled}
                value={form.contactEmail}
                onChange={(e) => setField('contactEmail', e.target.value)}
              />
            </div>
            <div className='md:col-span-3'>
              <Label htmlFor={`${fieldId}-contactPhone`}>Telefono</Label>
              <Input
                id={`${fieldId}-contactPhone`}
                disabled={disabled}
                value={form.contactPhone}
                onChange={(e) => setField('contactPhone', e.target.value)}
              />
            </div>

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
                />
              </div>
            ) : null}

            <div className='md:col-span-6'>
              <Label htmlFor={`${fieldId}-leadTargetDate`}>Fecha objetivo</Label>
              <Input
                id={`${fieldId}-leadTargetDate`}
                type='date'
                disabled={disabled}
                value={form.leadTargetDate}
                onChange={(e) => setField('leadTargetDate', e.target.value)}
              />
            </div>

            <div className='md:col-span-12'>
              <Dropzone
                label='Imagen de referencia'
                helper='Adjunta la foto del producto que trae el cliente como referencia.'
                accept='image/*'
                disabled={disabled}
                value={form.referenceImage ? [form.referenceImage] : []}
                onChange={(files) => setField('referenceImage', files[0] || null)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guardar */}
      <Card>
        <CardHeader title='Acciones' subtitle={disabled ? 'Vista lectura' : 'Guarda el Contacto inicial'} />
        <CardContent className='flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            disabled={disabled || !dirty}
            onClick={() => {
              setForm(initial);
              setDirty(false);
            }}
          >
            Descartar cambios
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
