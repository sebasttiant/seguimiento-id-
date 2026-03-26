import { beforeEach, describe, expect, it, vi } from "vitest";

const { dataSourceMock } = vi.hoisted(() => ({
  dataSourceMock: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("./projectDataSourceFactory.js", () => ({
  createProjectDataSource: () => dataSourceMock,
}));

import { projectRepository } from "./projectRepository.js";

function buildProject() {
  return {
    id: "project-1",
    locked: false,
    preBrief: { validated: false, clientName: "Cliente base" },
    clientBrief: {
      clientName: "Cliente base",
      leadStatus: "CALIFICADO",
      leadTargetDate: "2026-04-10",
      referenceImages: [{ id: "img-base", name: "base.png", mimeType: "image/png", size: 67 }],
      requirements: [],
    },
    techSpecs: { phMin: 5.2, phMax: 6.0 },
    samples: {
      items: [
        { id: "dev", kind: "dev", title: "Muestra de Desarrollo", changeLog: [], photos: [] },
        { id: "approved", kind: "approved", title: "Muestra Aprobada", changeLog: [], photos: [] },
      ],
    },
    qualityReg: { transportTests: "" },
    changes: { items: [] },
  };
}

describe("projectRepository extracted methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataSourceMock.list.mockResolvedValue([buildProject()]);
    dataSourceMock.getById.mockResolvedValue(buildProject());
    dataSourceMock.create.mockImplementation(async (project) => project);
    dataSourceMock.update.mockImplementation(async (project) => project);
  });

  it("updates client brief even when method is extracted", async () => {
    const updateClientBrief = projectRepository.updateClientBrief;
    const updated = await updateClientBrief("project-1", {
      clientName: "Cliente nuevo",
      requirements: [{ title: "Req 1", notes: "ok" }],
    });

    expect(dataSourceMock.getById).toHaveBeenCalledWith("project-1");
    expect(dataSourceMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "project-1",
        clientBrief: expect.objectContaining({
          clientName: "Cliente nuevo",
        }),
      })
    );
    expect(updated.clientBrief.clientName).toBe("Cliente nuevo");
    expect(updated.clientBrief.leadTargetDate).toBe("2026-04-10");
  });

  it("supports extracted advanced module mutations without losing context", async () => {
    const extractedCalls = [
      () => projectRepository.updatePreBrief("project-1", { validated: true }),
      () => projectRepository.updateTechSpecs("project-1", { phMin: 5.5, phMax: 6.5 }),
      () =>
        projectRepository.updateSamples("project-1", {
          items: [{ id: "dev", kind: "dev", title: "Lote 1", changeLog: [], photos: [] }],
        }),
      () => projectRepository.updateQualityReg("project-1", { packagingCharacteristics: "PET" }),
      () => projectRepository.updateChanges("project-1", { items: [{ id: "chg-1", summary: "ajuste" }] }),
    ];

    for (const run of extractedCalls) {
      await expect(run()).resolves.not.toBeNull();
    }

    expect(dataSourceMock.update).toHaveBeenCalledTimes(extractedCalls.length);
  });
});
