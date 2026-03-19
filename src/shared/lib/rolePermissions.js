export const PROJECT_WRITE_ALLOWED_ROLES = ["admin", "editor"];

export function getProjectWriteRestrictionMessage() {
  return "Tu perfil actual es de solo lectura. Para crear o editar proyectos necesitas rol Editor o Administrador.";
}
