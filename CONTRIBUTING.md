# Contributing to seguimiento-id

Gracias por contribuir.

## Flujo recomendado

1. Crea una rama desde `main` (`feature/...`, `fix/...`, `docs/...`).
2. Haz cambios pequenos y enfocados.
3. Ejecuta checks locales antes de abrir PR.
4. Abre PR con contexto claro (problema, solucion, evidencia).

## Reglas basicas

- No subir secretos ni `.env` reales.
- Mantener compatibilidad con Docker Compose existente.
- Evitar cambios disruptivos de naming interno sin justificar.
- Preferir documentar cambios operativos en `README.md` y `ops/OPERATIONS.md`.

## Checks minimos

```bash
npm test
npm run build
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml config > /tmp/compose.prod.rendered.yml
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml run --rm backend python manage.py test
```

## Estilo de commits

- Mensajes claros, orientados a intencion.
- Un tema por commit cuando sea posible.

## Pull requests

- Describe que cambia y por que.
- Incluye pasos de validacion ejecutados.
- Si hay cambios visuales, agrega captura o descripcion breve del resultado.
