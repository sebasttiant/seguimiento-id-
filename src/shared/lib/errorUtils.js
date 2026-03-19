function flattenErrorObject(obj) {
  if (!obj || typeof obj !== "object") return [];

  return Object.entries(obj).flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return [`${key}: ${value.join(" ")}`];
    }
    if (typeof value === "string") {
      return [`${key}: ${value}`];
    }
    if (value && typeof value === "object") {
      return flattenErrorObject(value).map((entry) => `${key}.${entry}`);
    }
    return [];
  });
}

export function toErrorMessage(error, fallback = "Ha ocurrido un error inesperado") {
  if (!error) return fallback;

  if (typeof error === "string") return error;
  if (error?.code === "ECONNABORTED") return "La solicitud tardó demasiado. Intenta de nuevo.";
  if (error?.response?.status === 401) return "Tu sesión expiró. Inicia sesión nuevamente.";
  if (error?.response?.status === 403) return "No tienes permisos para esta operación.";
  if (error?.response?.status >= 500) return "El servidor presentó un error. Intenta en unos minutos.";
  if (error?.response?.data?.detail) return String(error.response.data.detail);
  if (error?.response?.data?.message) return String(error.response.data.message);

  const flatMessages = flattenErrorObject(error?.response?.data);
  if (flatMessages.length > 0) {
    return flatMessages.join(". ");
  }

  if (error?.request && !error?.response) {
    return "No se pudo conectar con el servidor. Verifica que el backend esté activo.";
  }

  if (error instanceof Error && error.message) return error.message;

  if (error?.message) return String(error.message);

  return fallback;
}
