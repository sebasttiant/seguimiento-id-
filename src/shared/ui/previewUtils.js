const PREVIEW_URL_SCHEME_RE = /^(https?:|blob:|data:)/i;

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function cleanBase64Value(base64Value) {
  return String(base64Value || "")
    .replace(/^data:[^;]+;base64,/, "")
    .replace(/\s+/g, "");
}

export function isPreviewUrl(value) {
  return typeof value === "string" && PREVIEW_URL_SCHEME_RE.test(value.trim());
}

export function getPreviewSource(fileItem) {
  if (!fileItem || typeof fileItem !== "object") return null;

  const directUrl = firstString(fileItem.previewUrl, fileItem.fileUrl, fileItem.downloadUrl, fileItem.url);
  if (directUrl && isPreviewUrl(directUrl)) {
    return { kind: "url", href: directUrl };
  }

  const contentBase64 = firstString(fileItem.contentBase64);
  if (!contentBase64) return null;

  if (/^data:/i.test(contentBase64)) {
    return { kind: "url", href: contentBase64 };
  }

  return {
    kind: "base64",
    base64: cleanBase64Value(contentBase64),
    mimeType: firstString(fileItem.mimeType, fileItem.type) || "application/octet-stream",
  };
}

export function canPreviewFile(fileItem, onLoadFileContent) {
  if (!fileItem || typeof fileItem !== "object") return false;

  if (getPreviewSource(fileItem)) return true;

  const mimeType = String(fileItem.mimeType || fileItem.type || "");
  return mimeType.startsWith("image/") && typeof onLoadFileContent === "function";
}

export function base64ToBlobUrl(base64Value, mimeType) {
  const cleaned = cleanBase64Value(base64Value);

  if (!cleaned) return null;

  try {
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export function openPreviewWindow(url, popupWindow) {
  const nextPopupWindow =
    popupWindow || (typeof window !== "undefined" ? window.open("", "_blank", "noopener,noreferrer") : null);

  if (!nextPopupWindow) return null;

  try {
    nextPopupWindow.document.title = "Vista previa";
    nextPopupWindow.document.body.innerHTML =
      '<!doctype html><html><head><title>Vista previa</title></head><body style="font-family:sans-serif;padding:16px">Cargando vista previa...</body></html>';
  } catch {
    // Some browsers restrict touching about:blank before navigation.
  }

  try {
    nextPopupWindow.location.replace(url);
    nextPopupWindow.focus?.();
    return nextPopupWindow;
  } catch {
    try {
      nextPopupWindow.close?.();
    } catch {
      // Ignore close failures.
    }
    return null;
  }
}
