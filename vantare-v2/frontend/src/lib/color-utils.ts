export function brandTextColor(brand: string | undefined): string {
  if (!brand || brand === "#FFFFFF" || brand === "#FFF" || brand === "#000000") return "#000";
  const r = parseInt(brand.slice(1, 3), 16);
  const g = parseInt(brand.slice(3, 5), 16);
  const b = parseInt(brand.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 128 ? "#000" : "#fff";
}
