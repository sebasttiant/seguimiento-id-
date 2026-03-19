import { zodResolver } from '@hookform/resolvers/zod';
import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { techSpecsSchema } from '../../../domain/crm/schemas.js';
import { getRangeTone } from '../../../shared/lib/range.js';
import { Badge, Button, Card, CardContent, CardHeader, Input, Label, Select } from '../../../shared/ui/primitives.jsx';

function Chips({ items, onRemove, disabled }) {
  return (
    <div className='flex flex-wrap gap-2'>
      {items.map((x, idx) => (
        <span
          key={`${x}_${idx}`}
          className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800'
        >
          {x}
          <button
            type='button'
            disabled={disabled}
            onClick={() => onRemove(idx)}
            className='rounded-full px-2 py-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50'
            aria-label='remove'
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function toNullableNumber(v) {
  // RHF: cuando el input queda vacío, valueAsNumber produce NaN
  // y eso mata la validación. Aquí lo convertimos a null.
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function TechSpecsModule({ project, canEdit, onSave }) {
  const disabled = !canEdit;
  const [ingredientDraft, setIngredientDraft] = useState('');

  const form = useForm({
    resolver: zodResolver(techSpecsSchema),
    defaultValues: project.techSpecs,
    mode: 'onChange',
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty, isSubmitting },
  } = form;

  const phMin = watch('phMin');
  const phMax = watch('phMax');
  const phCurrent = watch('phCurrent');

  const hasPh = [phMin, phMax, phCurrent].every((v) => typeof v === 'number');
  const phTone = hasPh ? getRangeTone(phMin, phMax, phCurrent) : 'neutral';

  const phStatusText = useMemo(() => {
    if (!hasPh) return 'Completa los valores';
    if (phTone === 'bad') return 'Fuera de rango';
    if (phTone === 'warn') return 'Cerca del límite';
    if (phTone === 'good') return 'Dentro de rango';
    return 'Completa los valores';
  }, [hasPh, phTone]);

  const currentBorder = !hasPh
    ? ''
    : phTone === 'bad'
    ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
    : phTone === 'warn'
    ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-100'
    : phTone === 'good'
    ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
    : '';

  const requestedIngredients = watch('requestedIngredients') || [];

  function addIngredient() {
    const val = ingredientDraft.trim();
    if (!val) return;
    setValue('requestedIngredients', [...requestedIngredients, val], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setIngredientDraft('');
  }

  function removeIngredient(idx) {
    const next = requestedIngredients.filter((_, i) => i !== idx);
    setValue('requestedIngredients', next, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      {/* Sensorial + ingredientes */}
      <Card className='lg:col-span-2'>
        <CardHeader
          title='Requerimientos sensoriales y solicitados'
          subtitle='Información del brief (movida desde Cliente y Brief)'
          right={<Badge tone='info'>Brief</Badge>}
        />
        <CardContent>
          <div className='grid gap-3 md:grid-cols-3'>
            <div>
              <Label>Color</Label>
              <Input
                disabled={disabled}
                {...register('sensoryColor')}
                placeholder='Ej: Transparente / Blanco nacarado'
              />
            </div>
            <div>
              <Label>Olor</Label>
              <Input
                disabled={disabled}
                {...register('sensoryOdor')}
                placeholder='Ej: Cítrico, floral, sin fragancia'
              />
            </div>
            <div>
              <Label>Textura</Label>
              <Input disabled={disabled} {...register('sensoryTexture')} placeholder='Ej: Gel ligero, toque seco' />
            </div>
          </div>

          <div className='mt-4 grid gap-2'>
            <Label>Ingredientes solicitados por el cliente</Label>
            <div className='flex flex-col gap-2 md:flex-row'>
              <Input
                disabled={disabled}
                value={ingredientDraft}
                onChange={(e) => setIngredientDraft(e.target.value)}
                placeholder='Ej: Niacinamida, Ácido hialurónico…'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addIngredient();
                  }
                }}
              />
              <Button type='button' disabled={disabled} onClick={addIngredient} className='h-10'>
                Agregar
              </Button>
            </div>

            {requestedIngredients.length ? (
              <div className='mt-2'>
                <Chips items={requestedIngredients} onRemove={removeIngredient} disabled={disabled} />
              </div>
            ) : (
              <p className='text-sm text-slate-500'>Aún no has agregado ingredientes.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* pH */}
      <Card>
        <CardHeader
          title='pH'
          subtitle='Rango mínimo/máximo vs. resultado actual'
          right={<Badge tone={phTone}>{phStatusText}</Badge>}
        />
        <CardContent>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <div>
              <Label>Mínimo</Label>
              <Input
                type='number'
                step='0.01'
                inputMode='decimal'
                disabled={disabled}
                placeholder='Ej: 5.0'
                {...register('phMin', { setValueAs: toNullableNumber })}
              />
            </div>
            <div>
              <Label>Máximo</Label>
              <Input
                type='number'
                step='0.01'
                inputMode='decimal'
                disabled={disabled}
                placeholder='Ej: 6.0'
                {...register('phMax', { setValueAs: toNullableNumber })}
              />
            </div>
            <div>
              <Label>Actual</Label>
              <Input
                type='number'
                step='0.01'
                inputMode='decimal'
                disabled={disabled}
                placeholder='Ej: 5.6'
                className={currentBorder}
                {...register('phCurrent', { setValueAs: toNullableNumber })}
              />
            </div>
          </div>

          <div className='mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600'>
            Rojo fuera de rango · Ámbar cerca del límite · Verde OK
          </div>
        </CardContent>
      </Card>

      {/* Viscosidad */}
      <Card>
        <CardHeader
          title='Viscosidad (Brookfield)'
          subtitle='Valor + condiciones'
          right={<Badge tone='neutral'>Reología</Badge>}
        />
        <CardContent>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <div className='sm:col-span-2'>
              <Label>Resultado</Label>
              <Input
                type='number'
                inputMode='numeric'
                disabled={disabled}
                placeholder='Ej: 12000'
                {...register('viscosity', { setValueAs: toNullableNumber })}
              />
            </div>
            <div>
              <Label>Unidad</Label>
              <Select disabled={disabled} {...register('viscosityUnit')}>
                <option value='cP'>cP</option>
                <option value='mPa·s'>mPa·s</option>
                <option value='Pa·s'>Pa·s</option>
              </Select>
            </div>
          </div>

          <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <div>
              <Label>Torque (%)</Label>
              <Input
                type='number'
                inputMode='decimal'
                disabled={disabled}
                placeholder='Ej: 18'
                {...register('torque', { setValueAs: toNullableNumber })}
              />
            </div>
            <div>
              <Label>RPM</Label>
              <Input
                type='number'
                inputMode='numeric'
                disabled={disabled}
                placeholder='Ej: 20'
                {...register('rpm', { setValueAs: toNullableNumber })}
              />
            </div>
            <div>
              <Label>Tipo de aguja</Label>
              <Select disabled={disabled} {...register('needleType')}>
                <option value='Spindle #1'>Spindle #1</option>
                <option value='Spindle #2'>Spindle #2</option>
                <option value='Spindle #3'>Spindle #3</option>
                <option value='Spindle #4'>Spindle #4</option>
                <option value='Spindle #5'>Spindle #5</option>
                <option value='Spindle #6'>Spindle #6</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Densidad */}
      <Card>
        <CardHeader title='Densidad' subtitle='Control de consistencia' />
        <CardContent>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <div className='sm:col-span-2'>
              <Label>Resultado</Label>
              <Input
                type='number'
                step='0.001'
                inputMode='decimal'
                disabled={disabled}
                placeholder='Ej: 1.020'
                {...register('density', { setValueAs: toNullableNumber })}
              />
            </div>
            <div>
              <Label>Unidad</Label>
              <Select disabled={disabled} {...register('densityUnit')}>
                <option value='g/mL'>g/mL</option>
                <option value='kg/m³'>kg/m³</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card className='lg:col-span-2'>
        <CardHeader
          title='Acciones'
          subtitle={disabled ? 'Activa edición para guardar cambios.' : 'Guarda solo el módulo de Especificaciones.'}
          right={
            <Badge tone={disabled ? 'neutral' : 'warn'}>
              {disabled ? 'Lectura' : isDirty ? 'Cambios sin guardar' : 'Sin cambios'}
            </Badge>
          }
        />
        <CardContent className='flex flex-wrap items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            disabled={disabled || isSubmitting || !isDirty}
            onClick={() => form.reset(project.techSpecs)}
          >
            Descartar
          </Button>
          <Button
            type='button'
            disabled={disabled || isSubmitting}
            onClick={handleSubmit(async (values) => {
              await onSave(values);
            })}
          >
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
