import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import EditReadToggle from '../../../shared/ui/EditReadToggle.jsx';
import ModuleStepper from '../../../shared/ui/ModuleStepper.jsx';
import { toErrorMessage } from '../../../shared/lib/errorUtils.js';
import QueryState from '../../../shared/ui/QueryState.jsx';
import RoleRestrictionNotice from '../../../shared/ui/RoleRestrictionNotice.jsx';
import { Badge, Button } from '../../../shared/ui/primitives.jsx';
import SessionPanel from '../../auth/components/SessionPanel.jsx';
import { useAuth } from '../../auth/context/AuthContext.jsx';

import ChangesModule from '../../modules/changes/ChangesModule.jsx';
import ClientBriefModule from '../../modules/clientBrief/ClientBriefModule.jsx';
import PreBriefModule from '../../modules/preBrief/PreBriefModule.jsx';
import QualityRegModule from '../../modules/qualityReg/QualityRegModule.jsx';
import SamplesModule from '../../modules/samples/SamplesModule.jsx';
import TechSpecsModule from '../../modules/techSpecs/TechSpecsModule.jsx';
import { projectApi } from '../data/projectApi.js';

import {
  useProject,
  useSetLocked,
  useUpdateChanges,
  useUpdateClientBrief,
  useUpdateQualityReg,
  useUpdateSamples,
  useUpdateTechSpecs,
} from '../data/projectHooks.js';

const MODULES = [
  { id: 'prebrief', label: 'Contacto inicial' },
  { id: 'client', label: 'Cliente' },
  { id: 'samples', label: 'Muestras' },
  { id: 'specs', label: 'Especificaciones' },
  { id: 'quality', label: 'Calidad y Regulatorio' },
  { id: 'changes', label: 'Control de Cambios' },
];

export default function ProjectDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { hasRole } = useAuth();

  const viewOnly = useMemo(() => {
    const m = new URLSearchParams(location.search).get('mode');
    return m === 'view';
  }, [location.search]);

  const [activeId, setActiveId] = useState('prebrief');
  const [isEditMode, setIsEditMode] = useState(() => !viewOnly);
  const [flash, setFlash] = useState(null);
  const flashTimeoutRef = useRef(null);
  const stateFlashHydratedRef = useRef(false);

  const { data: project, isLoading, error } = useProject(id);

  const setLocked = useSetLocked(id);
  const updateClient = useUpdateClientBrief(id);
  const updateSamples = useUpdateSamples(id);
  const updateSpecs = useUpdateTechSpecs(id);
  const updateQuality = useUpdateQualityReg(id);
  const updateChanges = useUpdateChanges(id);

  const activeIndex = useMemo(() => {
    const idx = MODULES.findIndex((m) => m.id === activeId);
    return idx >= 0 ? idx : 0;
  }, [activeId]);

  const leadStatus = project?.clientBrief?.leadStatus || 'PENDIENTE';
  const isQualified = leadStatus === 'CALIFICADO';
  const canEditByRole = hasRole(['admin', 'editor']);
  const isViewerReadOnly = !canEditByRole;
  const effectiveViewOnly = viewOnly || isViewerReadOnly;

  function scheduleFlashClear(timeoutMs) {
    window.clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => setFlash(null), timeoutMs);
  }

  useEffect(() => {
    return () => {
      window.clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (stateFlashHydratedRef.current) return;
    const incomingFlash = location.state?.flash;
    if (incomingFlash?.title) {
      setFlash(incomingFlash);
      scheduleFlashClear(3000);
    }
    stateFlashHydratedRef.current = true;
  }, [location.state]);

  useEffect(() => {
    if (project?.locked) setIsEditMode(false);
  }, [project?.locked]);

  useEffect(() => {
    if (viewOnly || isViewerReadOnly) setIsEditMode(false);
  }, [isViewerReadOnly, viewOnly]);

  // ✅ Gate0: si NO está calificado, forzar estar en Contacto inicial
  useEffect(() => {
    if (project && !isQualified && activeId !== 'prebrief') {
      setActiveId('prebrief');
    }
  }, [project, isQualified, activeId]);

  function goPrev() {
    setActiveId(MODULES[Math.max(0, activeIndex - 1)].id);
  }

  function goNext() {
    const next = MODULES[Math.min(MODULES.length - 1, activeIndex + 1)].id;
    if (!isQualified && next !== 'prebrief') {
      setFlash({
        tone: 'bad',
        title: 'Lead pendiente',
        detail: 'Debes calificar el lead en Contacto inicial para continuar.',
      });
      scheduleFlashClear(3500);
      setActiveId('prebrief');
      return;
    }
    setActiveId(next);
  }

  async function runSave(label, fn) {
    try {
      setFlash({ tone: 'neutral', title: `Guardando ${label}…` });
      await fn();
      setFlash({ tone: 'good', title: `${label} guardado` });
      scheduleFlashClear(2500);
    } catch (e) {
      setFlash({ tone: 'bad', title: 'Error al guardar', detail: toErrorMessage(e) });
      scheduleFlashClear(5000);
    }
  }

  async function loadReferenceImage(moduleName) {
    const payload = await projectApi.getAdvancedModuleImage(id, moduleName);
    return payload?.referenceImage || null;
  }

  if (isLoading || error || !project) {
    return (
      <div className='mx-auto w-full max-w-6xl p-4 md:p-6'>
        <QueryState
          isLoading={isLoading}
          error={error}
          isEmpty={!isLoading && !error && !project}
          emptyMessage='Proyecto no encontrado'
        />
      </div>
    );
  }

  const locked = Boolean(project.locked);
  const projectLabel = project.consecutive || project.id;
  const canAdminLock = hasRole(['admin']);
  const canEdit = canEditByRole && isEditMode && !locked && !effectiveViewOnly;

  function ReadOnlyBlock({ children }) {
    return (
      <div className='relative'>
        {!canEdit ? <div className='absolute inset-0 z-10 cursor-not-allowed' title='Vista solo lectura' /> : null}
        <div className={!canEdit ? 'select-none opacity-95' : ''}>{children}</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <header className='sticky top-0 z-10 border-b bg-white/80 backdrop-blur'>
        <div className='container-max mx-auto flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between'>
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <Button type='button' variant='outline' className='h-9' onClick={() => navigate('/dashboard')}>
                ← Volver a Proyectos
              </Button>

              <h1 className='truncate text-lg font-semibold text-slate-900'>seguimiento-id · Seguimiento I+D</h1>

              {locked ? <Badge tone='bad'>Histórico</Badge> : <Badge tone='info'>Editable</Badge>}
              {effectiveViewOnly ? <Badge tone='neutral'>Ver</Badge> : <Badge tone='neutral'>Editar</Badge>}
              {!isQualified ? <Badge tone='warn'>Lead: Pendiente</Badge> : <Badge tone='good'>Lead: Calificado</Badge>}
            </div>

            <p className='mt-1 text-sm text-slate-500'>Proyecto {projectLabel} · Última actualización: {project.updatedAt}</p>
          </div>

          <div className='flex flex-wrap items-center gap-2 md:justify-end'>
            <SessionPanel compact />
            <EditReadToggle
              isEditMode={isEditMode}
              onToggle={() => setIsEditMode((v) => !v)}
              locked={locked || effectiveViewOnly || !canEditByRole}
            />
            <Button
              type='button'
              variant='outline'
              className='h-9'
              disabled={!canAdminLock}
              onClick={() => setLocked.mutate(!locked)}
            >
              {locked ? 'Desbloquear' : 'Bloquear'}
            </Button>
          </div>
        </div>
      </header>

      <main className='container-max mx-auto px-4 py-6'>
        {flash ? (
          <div className='mb-4'>
            <div
              className={[
                'rounded-2xl border p-3 text-sm',
                flash.tone === 'good'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : flash.tone === 'bad'
                  ? 'border-rose-200 bg-rose-50 text-rose-900'
                  : 'border-slate-200 bg-slate-50 text-slate-900',
              ].join(' ')}
              role='status'
              aria-live='polite'
            >
              <div className='font-medium'>{flash.title}</div>
              {flash.detail ? <div className='mt-0.5 text-xs opacity-80'>{flash.detail}</div> : null}
            </div>
          </div>
        ) : null}

        {!isQualified ? (
          <div className='mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900'>
            <div className='font-medium'>Gate 0: Lead pendiente</div>
            <div className='mt-0.5 text-xs opacity-90'>
              Para continuar a <span className='font-medium'>Cliente</span> debes marcar el lead como{' '}
              <span className='font-medium'>Calificado</span> en Contacto inicial.
            </div>
          </div>
        ) : null}

        {!canEditByRole ? <RoleRestrictionNotice className='mb-4' /> : null}

        <div className='mb-4 rounded-2xl border bg-white p-4'>
          <ModuleStepper
            items={MODULES}
            activeIndex={activeIndex}
            onChange={(i) => {
              const nextId = MODULES[i].id;
              if (!isQualified && nextId !== 'prebrief') {
                setFlash({
                  tone: 'bad',
                  title: 'Lead pendiente',
                  detail: 'Califica el lead en Contacto inicial para continuar.',
                });
                scheduleFlashClear(3500);
                setActiveId('prebrief');
                return;
              }
              setActiveId(nextId);
            }}
          />

          <div className='mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
            <p className='text-sm text-slate-500'>
              {locked ? (
                <>
                  Proyecto en <span className='font-medium'>Histórico</span>: edición bloqueada.
                </>
              ) : effectiveViewOnly ? (
                <>
                  Vista en <span className='font-medium'>Ver</span> (solo lectura).
                </>
              ) : canEdit ? (
                <>
                  Vista en <span className='font-medium'>Edición</span>.
                </>
              ) : (
                <>
                  Vista en <span className='font-medium'>Lectura</span>.
                </>
              )}
            </p>

            <div className='grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center'>
              <Button type='button' variant='outline' className='h-9 w-full md:w-auto' onClick={goPrev}>
                ← Anterior
              </Button>
              <Button type='button' className='h-9 w-full md:w-auto' onClick={goNext}>
                Siguiente →
              </Button>
            </div>
          </div>
        </div>

        {activeId === 'prebrief' && (
          <ReadOnlyBlock>
            <PreBriefModule
              project={project}
              canEdit={canEdit}
              onLoadReferenceImage={() => loadReferenceImage('clientbrief')}
              onSave={(v) =>
                runSave('Contacto inicial', () =>
                  updateClient.mutateAsync({
                    ...(project.clientBrief || {}),
                    ...v,
                  })
                )
              }
            />
          </ReadOnlyBlock>
        )}

        {activeId === 'client' && (
          <ReadOnlyBlock>
            <ClientBriefModule
              project={project}
              canEdit={canEdit}
              onLoadReferenceImage={() => loadReferenceImage('clientbrief')}
              onSave={(v) => runSave('Cliente', () => updateClient.mutateAsync(v))}
            />
          </ReadOnlyBlock>
        )}

        {activeId === 'samples' && (
          <ReadOnlyBlock>
            <SamplesModule
              project={project}
              canEdit={canEdit}
              onSave={(v) => runSave('Muestras', () => updateSamples.mutateAsync(v))}
            />
          </ReadOnlyBlock>
        )}

        {activeId === 'specs' && (
          <ReadOnlyBlock>
            <TechSpecsModule
              project={project}
              canEdit={canEdit}
              onSave={(v) => runSave('Especificaciones', () => updateSpecs.mutateAsync(v))}
            />
          </ReadOnlyBlock>
        )}

        {activeId === 'quality' && (
          <ReadOnlyBlock>
            <QualityRegModule
              project={project}
              canEdit={canEdit}
              onSave={(v) => runSave('Calidad y Regulatorio', () => updateQuality.mutateAsync(v))}
            />
          </ReadOnlyBlock>
        )}

        {activeId === 'changes' && (
          <ReadOnlyBlock>
            <ChangesModule
              project={project}
              canEdit={canEdit}
              onSave={(v) => runSave('Control de Cambios', () => updateChanges.mutateAsync(v))}
            />
          </ReadOnlyBlock>
        )}
      </main>
    </div>
  );
}
