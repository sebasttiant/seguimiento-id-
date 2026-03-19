import React from 'react';
import { Button } from './primitives.jsx';

export default function EditReadToggle({ isEditMode, onToggle, locked }) {
  // isEditMode = true => editando
  // botón "Lectura" cuando estás editando, para pasar a lectura
  // si ya estás en lectura, el botón dice "Editar" (pero NO lo mostramos si locked)
  const label = isEditMode ? 'Lectura' : 'Editar';

  return (
    <Button
      type='button'
      variant={isEditMode ? 'outline' : 'default'}
      className='h-9'
      disabled={locked}
      onClick={() => {
        if (!locked) onToggle();
      }}
      title={locked ? 'Proyecto en histórico (solo lectura)' : 'Cambiar modo'}
    >
      {label}
    </Button>
  );
}
