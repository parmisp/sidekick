// DEMO: URLs for generated SVG placeholder photos (see app/api/placeholder).
export function placeholderUrl(key: string, text: string, shape: "portrait" | "wide" = "portrait") {
  return `/api/placeholder/${encodeURIComponent(key)}?t=${encodeURIComponent(text)}&shape=${shape}`;
}
