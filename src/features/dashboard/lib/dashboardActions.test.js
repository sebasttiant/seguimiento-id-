import { describe, expect, it } from "vitest";

import { getDashboardActions, getProjectDisplayCode } from "./dashboardActions.js";

describe("dashboardActions", () => {
  it("keeps view action enabled for viewer roles", () => {
    const viewerActions = getDashboardActions(false);

    expect(viewerActions.canView).toBe(true);
    expect(viewerActions.canEdit).toBe(false);
  });

  it("uses consecutive format as source of truth", () => {
    const displayCode = getProjectDisplayCode({
      id: "7f7ac56f-6f4c-435c-a628-6f5903cbf419",
      consecutive: "0009-2026",
    });

    expect(displayCode).toBe("0009-2026");
  });

  it("falls back to UUID only when consecutive is missing or invalid", () => {
    const displayCode = getProjectDisplayCode({
      id: "7f7ac56f-6f4c-435c-a628-6f5903cbf419",
      consecutive: "7f7ac56f-6f4c-435c-a628-6f5903cbf419",
    });

    expect(displayCode).toBe("7f7ac56f-6f4c-435c-a628-6f5903cbf419");
  });
});
