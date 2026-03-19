import { describe, expect, it } from "vitest";
import { toErrorMessage } from "./errorUtils.js";

describe("toErrorMessage", () => {
  it("prioriza mensaje de conectividad sobre Error genérico de Axios", () => {
    const axiosLikeNetworkError = {
      message: "Network Error",
      request: {},
      response: undefined,
    };

    expect(toErrorMessage(axiosLikeNetworkError)).toBe(
      "No se pudo conectar con el servidor. Verifica que el backend esté activo."
    );
  });

  it("mantiene detalle backend cuando existe", () => {
    expect(toErrorMessage({ response: { data: { detail: "Credenciales inválidas" } } })).toBe(
      "Credenciales inválidas"
    );
  });
});
