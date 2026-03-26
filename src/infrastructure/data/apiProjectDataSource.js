import { projectApi, taskApi } from "../../features/project/data/projectApi.js";

const LEGACY_SHADOW_KEY = "crm_project_api_shadow_v1";
const LEGACY_PROJECTS_LIST_KEY = "crm-projects";
const LEGACY_PROJECTS_MAP_KEY = "crm_rnd_projects_v2";

function mapBackendStatusToLocked(status) {
  return status === "archived";
}

function mapLockedToBackendStatus(locked) {
  return locked ? "archived" : "active";
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseJson(raw, fallbackValue) {
  try {
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function estimateBase64Size(base64) {
  if (!base64 || typeof base64 !== "string") return 0;
  const clean = base64.trim();
  if (!clean) return 0;
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function createReferenceImageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `img_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function normalizeReferenceImage(referenceImage) {
  if (!referenceImage || typeof referenceImage !== "object") return null;

  const contentBase64 = firstString(referenceImage.contentBase64);
  const mimeType = firstString(referenceImage.mimeType, referenceImage.type) || "image/*";
  const parsedSize = Number(referenceImage.size);
  const size = Number.isFinite(parsedSize) && parsedSize > 0 ? Math.floor(parsedSize) : estimateBase64Size(contentBase64) || 1;
  const id = firstString(referenceImage.id) || createReferenceImageId();
  const name = firstString(referenceImage.name, referenceImage.fileName) || `${id}.png`;

  const normalized = {
    id,
    name,
    mimeType,
    size,
  };

  if (contentBase64) {
    normalized.contentBase64 = contentBase64;
  }

  if (referenceImage.uploadedAt) {
    normalized.uploadedAt = referenceImage.uploadedAt;
  }

  return normalized;
}

function normalizeModuleReferenceImage(moduleData) {
  if (!moduleData || typeof moduleData !== "object") return moduleData;
  const copy = { ...moduleData };
  copy.referenceImage = normalizeReferenceImage(copy.referenceImage);
  return copy;
}

function getDefaultModules() {
  return {
    preBrief: {
      validated: false,
      targetDate: "",
      clientName: "",
      nit: "",
      productName: "",
      brand: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      category: "",
      referenceImage: null,
    },
    clientBrief: {
      clientName: "",
      nit: "",
      productName: "",
      brand: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      category: "",
      referenceImage: null,
      requirements: [],
      leadStatus: "PENDIENTE",
      leadBudgetRange: "",
      leadTargetDate: "",
      leadNotes: "",
    },
    techSpecs: {},
    samples: { items: [] },
    qualityReg: {},
    changes: { items: [] },
  };
}

function normalizeAdvancedModules(input = {}) {
  const defaults = getDefaultModules();
  return {
    preBrief: {
      ...defaults.preBrief,
      ...(input.preBrief || {}),
    },
    clientBrief: {
      ...defaults.clientBrief,
      ...(input.clientBrief || {}),
    },
    techSpecs: {
      ...defaults.techSpecs,
      ...(input.techSpecs || {}),
    },
    samples: {
      ...defaults.samples,
      ...(input.samples || {}),
      items: Array.isArray(input?.samples?.items) ? input.samples.items : defaults.samples.items,
    },
    qualityReg: {
      ...defaults.qualityReg,
      ...(input.qualityReg || {}),
    },
    changes: {
      ...defaults.changes,
      ...(input.changes || {}),
      items: Array.isArray(input?.changes?.items) ? input.changes.items : defaults.changes.items,
    },
  };
}

function toApiPayload(project) {
  const clientName = String(project?.clientBrief?.clientName || "").trim();
  const fallbackName = String(project?.name || "").trim();
  const description = String(project?.description || project?.clientBrief?.productName || "").trim();

  return {
    name: clientName || fallbackName || "Proyecto I+D",
    description,
    status: mapLockedToBackendStatus(Boolean(project?.locked)),
  };
}

function toAdvancedModulesPayload(project) {
  return normalizeAdvancedModules({
    preBrief: normalizeModuleReferenceImage(project?.preBrief),
    clientBrief: normalizeModuleReferenceImage(project?.clientBrief),
    techSpecs: project?.techSpecs,
    samples: project?.samples,
    qualityReg: project?.qualityReg,
    changes: project?.changes,
  });
}

function toCoreProject(apiProject, advancedModules) {
  const locked = mapBackendStatusToLocked(apiProject?.status);
  const modules = normalizeAdvancedModules(advancedModules || apiProject?.advanced_modules || {});

  return {
    id: String(apiProject?.id || ""),
    consecutive: String(apiProject?.consecutive || ""),
    name: apiProject?.name || "Proyecto I+D",
    description: apiProject?.description || "",
    status: locked ? "Aprobado" : "En desarrollo",
    locked,
    createdAt: apiProject?.created_at || "",
    updatedAt: apiProject?.updated_at || "",
    preBrief: {
      ...modules.preBrief,
      clientName: modules.preBrief.clientName || modules.clientBrief.clientName || apiProject?.name || "",
    },
    clientBrief: {
      ...modules.clientBrief,
      clientName: modules.clientBrief.clientName || apiProject?.name || "",
    },
    techSpecs: modules.techSpecs,
    samples: modules.samples,
    qualityReg: modules.qualityReg,
    changes: modules.changes,
  };
}

function readLegacyShadowProject(id) {
  if (!canUseStorage()) return null;
  const shadow = parseJson(window.localStorage.getItem(LEGACY_SHADOW_KEY), {});
  const project = shadow && typeof shadow === "object" ? shadow[String(id)] : null;
  return project && typeof project === "object" ? project : null;
}

function readLegacyListProject(id) {
  if (!canUseStorage()) return null;
  const projects = parseJson(window.localStorage.getItem(LEGACY_PROJECTS_LIST_KEY), []);
  if (!Array.isArray(projects)) return null;
  return projects.find((row) => String(row?.id || "") === String(id)) || null;
}

function readLegacyMapProject(id) {
  if (!canUseStorage()) return null;
  const map = parseJson(window.localStorage.getItem(LEGACY_PROJECTS_MAP_KEY), {});
  if (!map || typeof map !== "object") return null;
  return map[String(id)] || null;
}

function cleanupLegacyStorage(projectId) {
  if (!canUseStorage()) return;
  const id = String(projectId);

  const shadow = parseJson(window.localStorage.getItem(LEGACY_SHADOW_KEY), {});
  if (shadow && typeof shadow === "object" && Object.prototype.hasOwnProperty.call(shadow, id)) {
    delete shadow[id];
    window.localStorage.setItem(LEGACY_SHADOW_KEY, JSON.stringify(shadow));
  }

  const projectList = parseJson(window.localStorage.getItem(LEGACY_PROJECTS_LIST_KEY), []);
  if (Array.isArray(projectList)) {
    const next = projectList.filter((row) => String(row?.id || "") !== id);
    window.localStorage.setItem(LEGACY_PROJECTS_LIST_KEY, JSON.stringify(next));
  }

  const projectMap = parseJson(window.localStorage.getItem(LEGACY_PROJECTS_MAP_KEY), {});
  if (projectMap && typeof projectMap === "object" && Object.prototype.hasOwnProperty.call(projectMap, id)) {
    delete projectMap[id];
    window.localStorage.setItem(LEGACY_PROJECTS_MAP_KEY, JSON.stringify(projectMap));
  }
}

async function migrateLegacyProjectData(projectId) {
  const legacyProject = readLegacyShadowProject(projectId) || readLegacyListProject(projectId) || readLegacyMapProject(projectId);
  if (!legacyProject) return;

  try {
    await projectApi.updateAdvancedModules(projectId, toAdvancedModulesPayload(legacyProject));
    cleanupLegacyStorage(projectId);
  } catch (error) {
    console.warn("No se pudo migrar datos locales legacy al backend", error);
  }
}

export function createApiProjectDataSource() {
  return {
    async list() {
      const rows = await projectApi.list();
      return rows.map((row) => toCoreProject(row));
    },

    async getById(id) {
      await migrateLegacyProjectData(id);

      const project = await projectApi.getById(id);
      const tasks = await taskApi.listByProject(id);
      const advancedModules = await projectApi.getAdvancedModules(id);

      return {
        ...toCoreProject(project, advancedModules),
        tasks,
      };
    },

    async create(project) {
      const created = await projectApi.createProject(toApiPayload(project));
      const advancedModules = await projectApi.updateAdvancedModules(
        created.id,
        toAdvancedModulesPayload(project)
      );
      return toCoreProject(created, advancedModules);
    },

    async update(project) {
      const updated = await projectApi.updateProject(project.id, toApiPayload(project));
      const advancedModules = await projectApi.updateAdvancedModules(
        project.id,
        toAdvancedModulesPayload(project)
      );
      return toCoreProject(updated, advancedModules);
    },
  };
}
