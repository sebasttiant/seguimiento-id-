import { afterEach, describe, expect, it, vi } from "vitest";
import {
  base64ToBlobUrl,
  canPreviewFile,
  cleanBase64Value,
  getPreviewSource,
  isPreviewUrl,
  openPreviewWindow,
} from "./previewUtils.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("previewUtils", () => {
  it("normalizes base64 payloads and preview urls", () => {
    expect(cleanBase64Value("data:image/png;base64, aGVs bG8=\n")).toBe("aGVsbG8=");
    expect(isPreviewUrl("https://example.com/image.png")).toBe(true);
    expect(isPreviewUrl("blob:sample")).toBe(true);
    expect(isPreviewUrl("/relative/path.png")).toBe(false);
  });

  it("detects direct and lazy preview sources", () => {
    expect(getPreviewSource({ previewUrl: "data:image/png;base64,aGVsbG8=" })).toEqual({
      kind: "url",
      href: "data:image/png;base64,aGVsbG8=",
    });

    expect(getPreviewSource({ fileUrl: "https://cdn.example.com/file.png" })).toEqual({
      kind: "url",
      href: "https://cdn.example.com/file.png",
    });

    expect(
      getPreviewSource({
        contentBase64: "aGVsbG8=",
        mimeType: "image/png",
      })
    ).toEqual({
      kind: "base64",
      base64: "aGVsbG8=",
      mimeType: "image/png",
    });
  });

  it("allows previewing image files in read only flows", () => {
    expect(canPreviewFile({ mimeType: "image/png", contentBase64: "aGVsbG8=" })).toBe(true);
    expect(canPreviewFile({ mimeType: "image/png" }, () => null)).toBe(true);
    expect(canPreviewFile({ mimeType: "application/pdf" }, () => null)).toBe(false);
  });

  it("creates blob urls from base64 payloads", () => {
    const createObjectUrl = vi.fn(() => "blob:preview-1");
    vi.stubGlobal("URL", { createObjectURL: createObjectUrl });

    expect(base64ToBlobUrl("data:image/png;base64,aGVs bG8=", "image/png")).toBe("blob:preview-1");
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
  });

  it("navigates a popup window instead of leaving about:blank", () => {
    const popupWindow = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      location: { replace: vi.fn() },
      focus: vi.fn(),
      close: vi.fn(),
    };

    expect(openPreviewWindow("https://example.com/image.png", popupWindow)).toBe(popupWindow);
    expect(popupWindow.location.replace).toHaveBeenCalledWith("https://example.com/image.png");
  });

  it("falls back to same-tab navigation when popup is blocked", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: { assign },
    });

    const result = openPreviewWindow("https://example.com/image.png", null, {
      attemptPopup: false,
      fallbackToSameTab: true,
    });

    expect(result).toEqual({ __fallback: "same-tab" });
    expect(assign).toHaveBeenCalledWith("https://example.com/image.png");
  });

  it("does not navigate away when only opening about:blank placeholder fails", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: { assign },
    });

    const result = openPreviewWindow("about:blank", null, {
      attemptPopup: false,
      fallbackToSameTab: true,
    });

    expect(result).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });
});
