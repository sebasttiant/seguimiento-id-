import { computeStatusCode, normalizeCategory, nowIso } from "../../../domain/project/projectRules.js";
import { createProjectDataSource } from "./projectDataSourceFactory.js";

const dataSource = createProjectDataSource();

function migrateSamples(samples) {
  if (!samples) return { items: [] };

  if (Array.isArray(samples.items)) {
    const mapped = (samples.items || []).map((item) => ({
      changeLog: [],
      photos: [],
      ...item,
      changeLog: Array.isArray(item.changeLog) ? item.changeLog : [],
      photos: Array.isArray(item.photos) ? item.photos : [],
    }));

    const hasDev = mapped.some((item) => item.kind === "dev");
    const hasApproved = mapped.some((item) => item.kind === "approved");

    const dev = hasDev
      ? mapped.filter((item) => item.kind === "dev")
      : [
          {
            id: "dev",
            kind: "dev",
            title: "Muestra de Desarrollo",
            batchCode: "",
            madeAt: "",
            approvedAt: "",
            deliveryAt: "",
            changeLog: [],
            photos: [],
            notes: "",
          },
        ];

    const extras = mapped.filter((item) => item.kind === "extra");
    const approved = hasApproved
      ? mapped.filter((item) => item.kind === "approved")
      : [
          {
            id: "approved",
            kind: "approved",
            title: "Muestra Aprobada",
            batchCode: "",
            madeAt: "",
            approvedAt: "",
            deliveryAt: "",
            changeLog: [],
            photos: [],
            notes: "",
          },
        ];

    return { items: [...dev, ...extras, ...approved] };
  }

  const dev = samples.dev || {};
  const approved = samples.approved || {};

  return {
    items: [
      {
        id: "dev",
        kind: "dev",
        title: "Muestra de Desarrollo",
        batchCode: dev.batchCode || dev.code || "",
        madeAt: dev.madeAt || "",
        approvedAt: dev.approvedAt || "",
        deliveryAt: dev.deliveryAt || "",
        changeLog: Array.isArray(dev.changeLog) ? dev.changeLog : [],
        photos: Array.isArray(dev.photos) ? dev.photos : [],
        notes: dev.notes || "",
      },
      {
        id: "approved",
        kind: "approved",
        title: "Muestra Aprobada",
        batchCode: approved.batchCode || approved.code || "",
        madeAt: approved.madeAt || "",
        approvedAt: approved.approvedAt || "",
        deliveryAt: approved.deliveryAt || "",
        changeLog: Array.isArray(approved.changeLog) ? approved.changeLog : [],
        photos: Array.isArray(approved.photos) ? approved.photos : [],
        notes: approved.notes || "",
      },
    ],
  };
}

function ensureProject(project) {
  const next = { ...project };

  next.preBrief = {
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
    referenceImages: [],
    ...(project.preBrief || {}),
  };
  if (!Array.isArray(next.preBrief.referenceImages)) {
    next.preBrief.referenceImages = next.preBrief.referenceImage ? [next.preBrief.referenceImage] : [];
  }
  next.preBrief.referenceImage = next.preBrief.referenceImages[0] || null;
  next.preBrief.category = normalizeCategory(next.preBrief.category);

  next.clientBrief = {
    clientName: "",
    nit: "",
    productName: "",
    brand: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    category: "",
    referenceImage: null,
    referenceImages: [],
    requirements: [],
    ...(project.clientBrief || {}),
  };
  if (!Array.isArray(next.clientBrief.referenceImages)) {
    next.clientBrief.referenceImages = next.clientBrief.referenceImage ? [next.clientBrief.referenceImage] : [];
  }
  next.clientBrief.referenceImage = next.clientBrief.referenceImages[0] || null;
  next.clientBrief.category = normalizeCategory(next.clientBrief.category);

  next.samples = migrateSamples(project.samples);
  return next;
}

async function listAllProjects() {
  const rows = await dataSource.list();
  return (rows || []).map(ensureProject);
}

async function getProjectById(id) {
  const found = await dataSource.getById(id);
  return found ? ensureProject(found) : null;
}

async function upsertProject(project) {
  const normalized = ensureProject(project);
  return dataSource.update(normalized);
}

export const projectRepository = {
  async list() {
    return listAllProjects();
  },

  async listSummaries() {
    const all = await listAllProjects();
    return all.map((project) => {
      const category = project.clientBrief?.category || project.preBrief?.category || "";
      return {
        id: project.id,
        consecutive: project.consecutive || "",
        clientName: project.clientBrief?.clientName || project.preBrief?.clientName || project.name || "",
        nit: project.clientBrief?.nit || project.preBrief?.nit || "",
        productName: project.clientBrief?.productName || project.preBrief?.productName || project.description || "",
        category,
        statusCode: computeStatusCode(project),
        locked: Boolean(project.locked),
        updatedAt: project.updatedAt || project.createdAt || "",
      };
    });
  },

  async createProject() {
    const project = {
      name: "Proyecto I+D",
      status: "En desarrollo",
      locked: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
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
        referenceImages: [],
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
        referenceImages: [],
        requirements: [{ title: "Requerimiento 1", notes: "" }],
      },
      techSpecs: {
        phMin: null,
        phMax: null,
        phCurrent: null,
        sensoryColor: "",
        sensoryOdor: "",
        sensoryTexture: "",
        requestedIngredients: [],
        viscosity: null,
        viscosityUnit: "cP",
        density: null,
        densityUnit: "g/mL",
        torque: null,
        rpm: null,
        needleType: "Spindle #1",
      },
      samples: {
        items: [
          {
            id: "dev",
            kind: "dev",
            title: "Muestra de Desarrollo",
            batchCode: "",
            madeAt: "",
            approvedAt: "",
            deliveryAt: "",
            changeLog: [],
            photos: [],
            notes: "",
          },
          {
            id: "approved",
            kind: "approved",
            title: "Muestra Aprobada",
            batchCode: "",
            madeAt: "",
            approvedAt: "",
            deliveryAt: "",
            changeLog: [],
            photos: [],
            notes: "",
          },
        ],
      },
      qualityReg: {
        chamberOfCommerceFiles: [],
        rutFiles: [],
        labelProjectFiles: [],
        technicalSheetsFiles: [],
        transportTests: "",
        packagingCharacteristics: "",
      },
      changes: {
        items: [],
      },
    };

    const created = await dataSource.create(project);
    return ensureProject(created);
  },

  async getById(id) {
    return getProjectById(id);
  },

  async setLocked(id, locked) {
    const project = await getProjectById(id);
    if (!project) return null;
    return upsertProject({ ...project, locked: Boolean(locked), updatedAt: nowIso() });
  },

  async updatePreBrief(id, preBrief) {
    const project = await getProjectById(id);
    if (!project) return null;
    return upsertProject({ ...project, preBrief: { ...project.preBrief, ...preBrief }, updatedAt: nowIso() });
  },

  async updateClientBrief(id, clientBrief) {
    const project = await getProjectById(id);
    if (!project) return null;
    return upsertProject({ ...project, clientBrief: { ...project.clientBrief, ...clientBrief }, updatedAt: nowIso() });
  },

  async updateTechSpecs(id, techSpecs) {
    const project = await getProjectById(id);
    if (!project) return null;
    return upsertProject({ ...project, techSpecs, updatedAt: nowIso() });
  },

  async updateSamples(id, samples) {
    const project = await getProjectById(id);
    if (!project) return null;
    return upsertProject({ ...project, samples: migrateSamples(samples), updatedAt: nowIso() });
  },

  async updateQualityReg(id, qualityReg) {
    const project = await getProjectById(id);
    if (!project) return null;
    return upsertProject({ ...project, qualityReg, updatedAt: nowIso() });
  },

  async updateChanges(id, changes) {
    const project = await getProjectById(id);
    if (!project) return null;
    return upsertProject({ ...project, changes, updatedAt: nowIso() });
  },
};

export default projectRepository;
