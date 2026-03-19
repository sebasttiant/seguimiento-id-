const CONSECUTIVE_PATTERN = /^\d{4}-\d{4}$/;

export function getDashboardActions(canEditProjects) {
  return {
    canView: true,
    canEdit: Boolean(canEditProjects),
  };
}

export function getProjectDisplayCode(row) {
  const consecutive = String(row?.consecutive || "").trim();
  if (CONSECUTIVE_PATTERN.test(consecutive)) {
    return consecutive;
  }
  return String(row?.id || "").trim();
}
