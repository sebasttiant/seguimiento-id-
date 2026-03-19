import { describe, expect, it } from "vitest";
import { computeStatusCode, nextConsecutive, normalizeCategory } from "./projectRules.js";

describe("projectRules", () => {
  it("nextConsecutive increments by current year", () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const next = nextConsecutive([{ id: `001-${year}` }, { id: `003-${year}` }]);
    expect(next).toBe(`004-${year}`);
  });

  it("normalizeCategory maps accented values", () => {
    expect(normalizeCategory("cosméticos")).toBe("COSMETICOS");
    expect(normalizeCategory("alimento")).toBe("ALIMENTOS");
  });

  it("computeStatusCode returns approved when locked", () => {
    const status = computeStatusCode({
      locked: true,
      preBrief: { validated: false },
      clientBrief: {},
      samples: { items: [] },
    });
    expect(status).toBe("APROBADO");
  });

  it("computeStatusCode returns en proceso for qualified lead with client data", () => {
    const status = computeStatusCode({
      locked: false,
      preBrief: { validated: true },
      clientBrief: { clientName: "Laboratorio ACME" },
      samples: { items: [] },
    });
    expect(status).toBe("EN_PROCESO");
  });
});
