import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const authState = {
  currentUser: null,
  logout: vi.fn(async () => {}),
};

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => authState,
}));

import SessionPanel from "./SessionPanel.jsx";

describe("SessionPanel", () => {
  it("does not render when there is no authenticated user", () => {
    authState.currentUser = null;
    const html = renderToStaticMarkup(React.createElement(SessionPanel));
    expect(html).toBe("");
  });

  it("renders neutral session text without exposing name or email", () => {
    authState.currentUser = {
      id: "u-admin",
      username: "admin",
      role: "admin",
    };

    const html = renderToStaticMarkup(React.createElement(SessionPanel));

    expect(html).toContain("Sesión activa");
    expect(html).not.toContain("Persona Visible");
    expect(html).not.toContain("persona@internal.invalid");
  });
});
