import React, { useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * Muestras = Iteraciones reales por consecutivo:
 * - 00526-1 (desarrollo)
 * - 00526-2 (iteración/cambio 1)
 * - 00526-3 (iteración/cambio 2)
 * - 00526-A (aprobada)
 *
 * ✅ Se elimina checkbox “hubo cambio”.
 * ✅ Botón “Adicionar cambio” crea una NUEVA iteración con siguiente -N.
 * ✅ Al aprobar (fecha aprobación) se replica en “Muestra aprobada”
 *    y se guarda approvedFromCode = consecutivo exacto aprobado (ej 00526-4).
 */

function uid(prefix = 'S') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeItem(i) {
  const base = {
    id: '',
    kind: 'extra', // dev | extra | approved
    title: '',
    batchCode: '',
    madeAt: '',
    approvedAt: '',
    deliveryAt: '',
    photos: [],
    notes: '',

    // Iteración real (hijo)
    parentId: '',
    parentCode: '',
    changeSummary: '',

    // Origen de aprobación (para approved)
    approvedFromId: '',
    approvedFromCode: '',
    approvedFromTitle: '',
  };

  const merged = { ...base, ...i };
  return {
    ...merged,
    photos: Array.isArray(merged.photos) ? merged.photos : [],
    notes: merged.notes || '',
    parentId: merged.parentId || '',
    parentCode: merged.parentCode || '',
    changeSummary: merged.changeSummary || '',
    approvedFromId: merged.approvedFromId || '',
    approvedFromCode: merged.approvedFromCode || '',
    approvedFromTitle: merged.approvedFromTitle || '',
  };
}

function ensureDevAndApproved(items, projectBase) {
  const arr = Array.isArray(items) ? items.map(normalizeItem) : [];

  // legacy pilot -> extra
  let next = arr.map((i) => (i.kind === 'pilot' ? { ...i, kind: 'extra' } : i));

  const hasDev = next.some((i) => i.kind === 'dev');
  const hasApproved = next.some((i) => i.kind === 'approved');

  if (!hasDev) {
    next.unshift(
      normalizeItem({
        id: 'dev',
        kind: 'dev',
        title: 'Muestra de desarrollo',
        batchCode: projectBase ? `${projectBase}-1` : '',
      })
    );
  }

  if (!hasApproved) {
    next.push(
      normalizeItem({
        id: 'approved',
        kind: 'approved',
        title: 'Muestra aprobada',
        batchCode: projectBase ? `${projectBase}-A` : '',
      })
    );
  }

  const dev = next.find((i) => i.kind === 'dev');
  if (dev && projectBase && (!dev.batchCode || !String(dev.batchCode).trim())) {
    dev.batchCode = `${projectBase}-1`;
  }
  const approvedFix = next.find((i) => i.kind === 'approved');
  if (approvedFix && projectBase && (!approvedFix.batchCode || !String(approvedFix.batchCode).trim())) {
    approvedFix.batchCode = `${projectBase}-A`;
  }

  // Ordena dev/extras por el número del batchCode (-N) y deja approved al final
  const approved = next.find((i) => i.kind === 'approved');
  const rest = next.filter((i) => i.kind !== 'approved');

  const ordered = rest
    .map((i) => {
      const m = String(i.batchCode || '').match(/-(\d+)$/);
      const n = m ? Number(m[1]) : 999999;
      return { ...i, __n: n };
    })
    .sort((a, b) => a.__n - b.__n)
    .map(({ __n, ...r }) => r);

  return approved ? [...ordered, approved] : ordered;
}

function formatShort(ts) {
  try {
    return new Date(ts).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

// Header clickable sin <button> wrapper
function AccordionRow({ title, subtitle, right, open, onToggle, children, indent = 0 }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white' style={{ marginLeft: indent ? indent * 18 : 0 }}>
      <div className='flex w-full items-center justify-between gap-3 px-4 py-3'>
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
            aria-label={open ? 'Cerrar' : 'Abrir'}
            title={open ? 'Cerrar' : 'Abrir'}
          >
            {open ? '▾' : '▸'}
          </button>
        </div>
      </div>

      {open ? <div className='border-t border-slate-100 px-4 py-4'>{children}</div> : null}
    </div>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className='fixed inset-0 z-50 grid place-items-center'>
      <div className='absolute inset-0 bg-black/30' onClick={onClose} />
      <div className='relative w-[min(720px,92vw)] rounded-2xl border border-slate-200 bg-white shadow-xl'>
        <div className='flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4'>
          <div>
            <div className='text-sm font-semibold text-slate-900'>{title}</div>
            <div className='mt-0.5 text-xs text-slate-500'>
              Se creará una nueva iteración con el siguiente consecutivo.
            </div>
          </div>
          <Button type='button' variant='ghost' className='h-9' onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <div className='px-5 py-4'>{children}</div>
      </div>
    </div>
  );
}

export default function SamplesModule({ project, canEdit, onSave }) {
  const disabled = !canEdit;
  const pickerRefs = useRef({});

  // 001-26 => 00126
  const projectBase = useMemo(() => String(project?.id || '').replace(/-/g, ''), [project?.id]);
  const approvedCode = useMemo(() => (projectBase ? `${projectBase}-A` : ''), [projectBase]);

  const initialItems = useMemo(() => {
    const raw = project?.samples?.items || project?.samples || [];
    const items = Array.isArray(raw) ? raw : raw.items || [];
    return ensureDevAndApproved(items, projectBase);
  }, [project, projectBase]);

  const [items, setItems] = useState(initialItems);
  const [openId, setOpenId] = useState(initialItems?.[0]?.id || 'dev');
  const [dirty, setDirty] = useState(false);

  // Modal: crear iteración
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeFromId, setChangeFromId] = useState(null);
  const [changeSummary, setChangeSummary] = useState('');

  useEffect(() => {
    setItems(initialItems);
    setOpenId(initialItems?.[0]?.id || 'dev');
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  function computeNextN() {
    const nums = items
      .filter((i) => i.kind !== 'approved')
      .map((i) => {
        const m = String(i.batchCode || '').match(/-(\d+)$/);
        return m ? Number(m[1]) : null;
      })
      .filter((n) => Number.isFinite(n));
    const max = nums.length ? Math.max(...nums) : 1;
    return max + 1;
  }

  function updateItem(id, patch) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setDirty(true);
  }

  function addFiles(id, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const mapped = files.map((f) => ({
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified,
      previewUrl: f.type?.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));

    const item = items.find((x) => x.id === id);
    updateItem(id, { photos: [...(item?.photos || []), ...mapped] });
  }

  function openAddChange(fromId) {
    setChangeFromId(fromId);
    setChangeSummary('');
    setChangeModalOpen(true);
  }

  function confirmAddChange() {
    const from = items.find((i) => i.id === changeFromId);
    if (!from || !projectBase) {
      setChangeModalOpen(false);
      setChangeFromId(null);
      return;
    }

    const nextN = computeNextN();
    const newId = uid('iter');
    const batchCode = `${projectBase}-${nextN}`;

    const next = normalizeItem({
      id: newId,
      kind: 'extra',
      title: 'Iteración',
      batchCode,
      parentId: from.id,
      parentCode: from.batchCode,
      changeSummary: changeSummary.trim(),

      // Copia mínima para no re-digitar (puedes ajustar)
      notes: from.notes || '',
      photos: [],
      madeAt: '',
      deliveryAt: '',
      approvedAt: '',
    });

    setItems((prev) => {
      const approved = prev.find((x) => x.kind === 'approved');
      const rest = prev.filter((x) => x.kind !== 'approved');
      return ensureDevAndApproved([...rest, next, ...(approved ? [approved] : [])], projectBase);
    });

    setOpenId(newId);
    setDirty(true);
    setChangeModalOpen(false);
    setChangeFromId(null);
  }

  function replicateToApproved(fromId) {
    setItems((prev) => {
      const from = prev.find((x) => x.id === fromId);
      const idx = prev.findIndex((x) => x.kind === 'approved');
      if (!from || idx === -1) return prev;

      const approved = prev[idx];
      const nextApproved = {
        ...approved,
        batchCode: approvedCode,
        madeAt: from.madeAt || '',
        approvedAt: from.approvedAt || '',
        deliveryAt: from.deliveryAt || '',
        photos: from.photos || [],
        notes: from.notes || '',
        approvedFromId: from.id,
        approvedFromCode: from.batchCode || '',
        approvedFromTitle: from.kind === 'dev' ? 'Muestra de desarrollo' : 'Iteración',
      };

      const out = [...prev];
      out[idx] = nextApproved;
      return out;
    });

    setDirty(true);
  }

  function save() {
    onSave({ items });
    setDirty(false);
  }

  function discard() {
    const base = ensureDevAndApproved(initialItems, projectBase);
    setItems(base);
    setOpenId(base?.[0]?.id || 'dev');
    setDirty(false);
  }

  const approvedItem = useMemo(() => items.find((i) => i.kind === 'approved'), [items]);
  const list = useMemo(() => items.filter((i) => i.kind !== 'approved'), [items]);

  return (
    <div className='grid gap-4'>
      <Modal
        open={changeModalOpen}
        title='Adicionar cambio (crea nueva iteración)'
        onClose={() => {
          setChangeModalOpen(false);
          setChangeFromId(null);
        }}
      >
        <div className='grid gap-3'>
          <Label>Describe el cambio</Label>
          <Textarea
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            placeholder='Ej: Ajuste fragancia 0.8%→0.6% por intensidad.'
          />
          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' onClick={() => setChangeModalOpen(false)}>
              Cancelar
            </Button>
            <Button type='button' onClick={confirmAddChange} disabled={!projectBase}>
              Crear iteración
            </Button>
          </div>
        </div>
      </Modal>

      <Card>
        <CardHeader
          title='Gestión de Muestras e Iteraciones'
          subtitle='Cada cambio crea una nueva iteración con consecutivo (-2, -3, ...).'
          right={
            <div className='flex items-center gap-2'>
              {dirty ? <Badge tone='warn'>Cambios sin guardar</Badge> : <Badge tone='neutral'>Sin cambios</Badge>}
            </div>
          }
        />
        <CardContent>
          <div className='grid gap-3'>
            {list.map((it) => {
              const open = openId === it.id;

              const title =
                it.kind === 'dev'
                  ? `${it.batchCode || ''} · Muestra de desarrollo`
                  : `${it.batchCode || ''} · Iteración`;

              const subtitle = [
                it.changeSummary ? `Cambio: ${it.changeSummary}` : null,
                it.madeAt ? `Elab: ${it.madeAt}` : null,
                it.deliveryAt ? `Ent: ${it.deliveryAt}` : null,
                it.approvedAt ? `Aprob: ${it.approvedAt}` : null,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <AccordionRow
                  key={it.id}
                  title={title}
                  subtitle={subtitle || 'Registra fechas, entrega y adjuntos.'}
                  open={open}
                  onToggle={() => setOpenId(open ? '' : it.id)}
                  right={
                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        className='h-8 px-3 text-xs'
                        disabled={disabled || !projectBase}
                        onClick={() => openAddChange(it.id)}
                      >
                        + Adicionar cambio
                      </Button>

                      <Button
                        type='button'
                        variant='outline'
                        className='h-8 px-3 text-xs'
                        disabled={disabled}
                        onClick={() => pickerRefs.current[it.id]?.click()}
                      >
                        Adjuntar fotos
                      </Button>
                    </div>
                  }
                >
                  <div className='space-y-4'>
                    {it.parentCode ? (
                      <div className='rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700'>
                        Derivada de: <span className='font-medium'>{it.parentCode}</span>
                        {it.changeSummary ? (
                          <>
                            {' '}
                            · <span className='text-slate-600'>{it.changeSummary}</span>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    <div className='grid gap-3 md:grid-cols-12'>
                      <div className='md:col-span-4'>
                        <Label>Código / Lote</Label>
                        <Input disabled value={it.batchCode || ''} />
                      </div>

                      <div className='md:col-span-2'>
                        <Label>Fecha elaboración</Label>
                        <Input
                          type='date'
                          disabled={disabled}
                          value={it.madeAt || ''}
                          onChange={(e) => updateItem(it.id, { madeAt: e.target.value })}
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <Label>Fecha aprobación</Label>
                        <Input
                          type='date'
                          disabled={disabled}
                          value={it.approvedAt || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateItem(it.id, { approvedAt: val });
                            if (val) replicateToApproved(it.id);
                          }}
                        />
                      </div>

                      <div className='md:col-span-2'>
                        <Label>Fecha de entrega</Label>
                        <Input
                          type='date'
                          disabled={disabled}
                          value={it.deliveryAt || ''}
                          onChange={(e) => updateItem(it.id, { deliveryAt: e.target.value })}
                        />
                      </div>

                      <div className='md:col-span-2 flex items-end'>
                        <Badge tone={it.approvedAt ? 'good' : 'neutral'}>
                          {it.approvedAt ? 'Aprobada' : 'Iteración'}
                        </Badge>
                      </div>
                    </div>

                    <input
                      ref={(el) => (pickerRefs.current[it.id] = el)}
                      type='file'
                      multiple
                      accept='image/*'
                      className='hidden'
                      disabled={disabled}
                      onChange={(e) => {
                        addFiles(it.id, e.target.files);
                        e.target.value = '';
                      }}
                    />

                    <Dropzone
                      label='Fotos de la muestra'
                      helper='Arrastra imágenes aquí o usa el botón "Adjuntar fotos".'
                      accept='image/*'
                      disabled={disabled}
                      value={it.photos || []}
                      onChange={(files) => updateItem(it.id, { photos: files })}
                      hidePickButton
                    />

                    <div>
                      <Label>Notas</Label>
                      <Textarea
                        disabled={disabled}
                        value={it.notes || ''}
                        onChange={(e) => updateItem(it.id, { notes: e.target.value })}
                        placeholder='Notas de esta iteración...'
                      />
                    </div>
                  </div>
                </AccordionRow>
              );
            })}

            {/* Muestra aprobada (separada) */}
            {approvedItem ? (
              <AccordionRow
                title={`${approvedItem.batchCode || approvedCode} · Muestra aprobada`}
                subtitle={
                  approvedItem.approvedFromCode
                    ? `Aprobada desde: ${approvedItem.approvedFromCode}`
                    : 'Aún no hay una iteración aprobada.'
                }
                open={openId === approvedItem.id}
                onToggle={() => setOpenId(openId === approvedItem.id ? '' : approvedItem.id)}
                right={<Badge tone={approvedItem.approvedFromCode ? 'good' : 'neutral'}>Aprobada</Badge>}
              >
                <div className='space-y-3'>
                  {approvedItem.approvedFromCode ? (
                    <div className='rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700'>
                      Referencia aprobada: <span className='font-medium'>{approvedItem.approvedFromCode}</span>
                    </div>
                  ) : (
                    <div className='rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700'>
                      Para aprobar: asigna una fecha de aprobación en una iteración.
                    </div>
                  )}

                  <div className='grid gap-3 md:grid-cols-12'>
                    <div className='md:col-span-4'>
                      <Label>Código aprobado</Label>
                      <Input disabled value={approvedItem.batchCode || approvedCode} />
                    </div>
                    <div className='md:col-span-8'>
                      <Label>Notas</Label>
                      <Textarea disabled value={approvedItem.notes || ''} />
                    </div>
                  </div>
                </div>
              </AccordionRow>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title='Acciones'
          subtitle={disabled ? 'Activa edición para guardar cambios.' : 'Guarda el módulo de Muestras.'}
          right={
            <Badge tone={disabled ? 'neutral' : dirty ? 'warn' : 'neutral'}>
              {disabled ? 'Lectura' : dirty ? 'Cambios sin guardar' : 'Sin cambios'}
            </Badge>
          }
        />
        <CardContent className='flex items-center justify-end gap-2'>
          <Button type='button' variant='outline' disabled={disabled || !dirty} onClick={discard}>
            Descartar
          </Button>
          <Button type='button' disabled={disabled} onClick={save}>
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
