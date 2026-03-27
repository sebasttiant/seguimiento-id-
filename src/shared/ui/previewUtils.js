const PREVIEW_URL_SCHEME_RE = /^(https?:|blob:|data:)/i;
const ABOUT_BLANK_RE = /^about:blank$/i;

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
  const supportsLazy = mimeType.startsWith("image/") || mimeType === "application/pdf";
  return supportsLazy && typeof onLoadFileContent === "function";
}

function isImageMimeType(mimeType) {
  return String(mimeType || "").toLowerCase().startsWith("image/");
}

function isLikelyImageUrl(url) {
  const value = String(url || "").toLowerCase();
  if (value.startsWith("data:image/")) return true;
  return /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/.test(value);
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

function writeLoadingDocument(popupWindow) {
  popupWindow.document.open();
  popupWindow.document.write(`<!doctype html>
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
        color: #475569;
      }
    </style>
  </head>
  <body>Cargando vista previa…</body>
</html>`);
  popupWindow.document.close();
}

function navigateInCurrentTab(url) {
  if (typeof window === "undefined") return false;

  try {
    if (typeof document !== "undefined" && document.createElement) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_self";
      link.rel = "noreferrer";
      document.body?.appendChild(link);
      link.click();
      link.remove();
      return true;
    }
  } catch {
    // Fall back to location navigation.
  }

  try {
    window.location.assign(url);
    return true;
  } catch {
    return false;
  }
}

export function openPreviewWindow(url, popupWindow, options = {}) {
  const { fallbackToSameTab = true, attemptPopup = true, mimeType = "" } = options;
  const normalizedUrl = String(url || "").trim();
  const canNavigate = isPreviewUrl(normalizedUrl);
  const isAboutBlank = ABOUT_BLANK_RE.test(normalizedUrl);

  const nextPopupWindow =
    popupWindow ||
    (typeof window !== "undefined" && attemptPopup
      ? window.open("", "_blank")
      : null);

  if (!nextPopupWindow) {
    if (fallbackToSameTab && canNavigate && !isAboutBlank && navigateInCurrentTab(normalizedUrl)) {
      return { __fallback: "same-tab" };
    }
    return null;
  }

  if (!popupWindow) {
    try {
      nextPopupWindow.opener = null;
    } catch {
      // Ignore security errors.
    }
  }

  if (isAboutBlank) {
    try {
      writeLoadingDocument(nextPopupWindow);
      nextPopupWindow.focus?.();
      return nextPopupWindow;
    } catch {
      return null;
    }
  }

  try {
    const safeUrl = normalizedUrl
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    nextPopupWindow.document.open();
    const renderImage = isImageMimeType(mimeType) || isLikelyImageUrl(normalizedUrl);
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
      .preview-image {
        max-width: min(100vw - 48px, 1200px);
        max-height: calc(100vh - 48px);
        object-fit: contain;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        border-radius: 16px;
        background: #fff;
      }
      .preview-embed {
        width: min(100vw - 48px, 1200px);
        height: calc(100vh - 48px);
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: #fff;
      }
    </style>
  </head>
  <body>
    ${
      renderImage
        ? `<img class="preview-image" src="${safeUrl}" alt="Vista previa" />`
        : `<iframe class="preview-embed" src="${safeUrl}" title="Vista previa" />`
    }
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
  const isNavigableUrl = /^https?:/i.test(normalizedUrl);

  if (!isNavigableUrl) {
    nextPopupWindow.focus?.();
    return nextPopupWindow;
  }

  try {
    nextPopupWindow.location.replace(normalizedUrl);
    nextPopupWindow.focus?.();
    return nextPopupWindow;
  } catch {
    if (fallbackToSameTab && navigateInCurrentTab(normalizedUrl)) {
      return { __fallback: "same-tab" };
    }

    try {
      nextPopupWindow.close?.();
    } catch {
      // Ignore close failures.
    }
    return null;
  }
}
