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
    const safeUrl = String(url || "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    nextPopupWindow.document.open();
    nextPopupWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Vista previa</title>
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: #ffffff;
        font-family: sans-serif;
      }
      body {
        display: grid;
        place-items: center;
        padding: 24px;
        box-sizing: border-box;
      }
      img {
        max-width: min(100vw - 48px, 1200px);
        max-height: calc(100vh - 48px);
        object-fit: contain;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        border-radius: 16px;
        background: #fff;
      }
    </style>
  </head>
  <body>
    <img src="${safeUrl}" alt="Vista previa" />
  </body>
</html>`);
    nextPopupWindow.document.close();
  } catch {
    // Some browsers restrict touching about:blank before navigation.
  }

  // For blob: and data: URLs the document.write() above already rendered the
  // image correctly. Calling location.replace() on these schemes can cause a
  // black/broken display in some browsers because the browser replaces the
  // rendered page with a raw resource navigation that may fail or show nothing.
  // Only use location.replace() for http/https navigable URLs.
  const isNavigableUrl = /^https?:/i.test(String(url || ""));

  if (!isNavigableUrl) {
    nextPopupWindow.focus?.();
    return nextPopupWindow;
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
