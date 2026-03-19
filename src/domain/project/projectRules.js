export function nowIso() {
  return new Date().toISOString();
}

export function nextConsecutive(projects) {
  const year = new Date().getFullYear().toString().slice(-2);
  const suffix = `-${year}`;

  const numbers = projects
    .map((project) => project.id)
    .filter((id) => typeof id === "string" && id.endsWith(suffix))
    .map((id) => Number(id.split("-")[0]))
    .filter((n) => Number.isFinite(n));

  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${String(next).padStart(3, "0")}-${year}`;
}

export function normalizeCategory(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "COSMETICOS" || normalized === "COSMÉTICOS") return "COSMETICOS";
  if (normalized === "VETERINARIOS" || normalized === "VETERINARIO") return "VETERINARIOS";
  if (normalized === "ALIMENTOS" || normalized === "ALIMENTO") return "ALIMENTOS";
  return "";
}

export function computeStatusCode(project) {
  const samples = project.samples;
  const approvedItem = (samples.items || []).find((item) => item.kind === "approved");
  if (project.locked) return "APROBADO";
  if (approvedItem?.approvedAt) return "APROBADO";

  if (!project.preBrief?.validated) return "PENDIENTE";

  const hasClientData =
    project.clientBrief?.clientName ||
    project.clientBrief?.nit ||
    project.clientBrief?.productName ||
    project.clientBrief?.brand ||
    project.clientBrief?.contactName;

  const hasSamplesData = (samples.items || []).some(
    (item) =>
      item.batchCode ||
      item.madeAt ||
      item.deliveryAt ||
      item.approvedAt ||
      (item.photos || []).length ||
      item.notes ||
      (item.changeLog || []).length
  );

  return hasClientData || hasSamplesData ? "EN_PROCESO" : "PENDIENTE";
}
