import { beforeEach, describe, expect, it, vi } from "vitest";

const { projectApiMock, taskApiMock } = vi.hoisted(() => ({
  projectApiMock: {
    list: vi.fn(),
    getById: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    getAdvancedModules: vi.fn(),
    updateAdvancedModules: vi.fn(),
  },
  taskApiMock: {
    listByProject: vi.fn(),
  },
}));

vi.mock("../../features/project/data/projectApi.js", () => ({
  projectApi: projectApiMock,
  taskApi: taskApiMock,
}));

import { createApiProjectDataSource } from "./apiProjectDataSource.js";

function createStorageMock() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

describe("createApiProjectDataSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const localStorage = createStorageMock();
    global.window = {
      localStorage,
    };
  });

  it("migrates legacy local shadow to backend and cleans shadow storage", async () => {
    const legacyProject = {
      id: "project-1",
      clientBrief: {
        clientName: "Legacy Labs",
      },
      samples: {
        items: [{ id: "dev", kind: "dev", title: "Legacy Sample" }],
      },
    };

    window.localStorage.setItem("crm_project_api_shadow_v1", JSON.stringify({ "project-1": legacyProject }));

    projectApiMock.getById.mockResolvedValue({
      id: "project-1",
      name: "Proyecto I+D",
      description: "",
      status: "active",
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z",
    });
    projectApiMock.getAdvancedModules.mockResolvedValue({
      preBrief: { validated: false },
      clientBrief: { clientName: "Legacy Labs" },
      techSpecs: {},
      samples: { items: [{ id: "dev", kind: "dev", title: "Legacy Sample" }] },
      qualityReg: {},
      changes: { items: [] },
    });
    projectApiMock.updateAdvancedModules.mockResolvedValue({});
    taskApiMock.listByProject.mockResolvedValue([]);

    const ds = createApiProjectDataSource();
    await ds.getById("project-1");

    expect(projectApiMock.updateAdvancedModules).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        clientBrief: expect.objectContaining({ clientName: "Legacy Labs" }),
      })
    );

    const shadowAfter = JSON.parse(window.localStorage.getItem("crm_project_api_shadow_v1") || "{}");
    expect(shadowAfter["project-1"]).toBeUndefined();
  });

  it("updates project and modules only through backend API", async () => {
    projectApiMock.updateProject.mockResolvedValue({
      id: "project-2",
      name: "Proyecto API",
      description: "desc",
      status: "active",
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-02T00:00:00Z",
    });
    projectApiMock.updateAdvancedModules.mockResolvedValue({
      preBrief: { validated: true },
      clientBrief: { clientName: "Cliente API" },
      techSpecs: { phMin: 5.2, phMax: 6.0 },
      samples: { items: [] },
      qualityReg: {},
      changes: { items: [] },
    });

    const ds = createApiProjectDataSource();
    await ds.update({
      id: "project-2",
      name: "Proyecto API",
      description: "desc",
      locked: false,
      preBrief: { validated: true },
      clientBrief: { clientName: "Cliente API" },
      techSpecs: { phMin: 5.2, phMax: 6.0 },
      samples: { items: [] },
      qualityReg: {},
      changes: { items: [] },
    });

    expect(projectApiMock.updateProject).toHaveBeenCalledTimes(1);
    expect(projectApiMock.updateAdvancedModules).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("crm_project_api_shadow_v1")).toBeNull();
  });
});
