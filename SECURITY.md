# Security Policy

## Supported Versions

Este proyecto se mantiene en modalidad rolling release. Se recomienda reportar hallazgos sobre la rama activa principal.

## Reporting a Vulnerability

Si encuentras una vulnerabilidad:

1. No abras un issue publico con detalles explotables.
2. Reporta de forma privada al equipo mantenedor con:
   - descripcion del hallazgo
   - impacto esperado
   - pasos de reproduccion
   - version/commit afectado
3. Espera confirmacion de recepcion antes de divulgar.

## Disclosure Process

- Acuse de recibo objetivo: dentro de 72 horas.
- Evaluacion inicial y severidad: dentro de 7 dias.
- Coordinacion de fix y publicacion responsable segun criticidad.

## Hardening Basico Recomendado

- usar secretos unicos por entorno
- rotar `SECRET_KEY` y claves comprometidas
- configurar TLS real en produccion
- limitar `ALLOWED_HOSTS`, CORS y CSRF a dominios validos
- mantener imagenes base de Docker actualizadas
