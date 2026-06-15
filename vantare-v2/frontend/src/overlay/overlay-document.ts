const OVERLAY_CLASS = "desktop-overlay";

export function applyOverlayDocumentMode() {
  document.documentElement.classList.add(OVERLAY_CLASS);
  document.body.classList.add(OVERLAY_CLASS);

  return () => {
    document.documentElement.classList.remove(OVERLAY_CLASS);
    document.body.classList.remove(OVERLAY_CLASS);
  };
}
