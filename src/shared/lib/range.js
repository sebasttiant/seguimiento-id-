export function getRangeTone(min, max, current) {
  if ([min, max, current].some(v => typeof v !== "number" || Number.isNaN(v))) return "neutral";
  if (current < min || current > max) return "bad";
  const span = max - min;
  if (span > 0) {
    const margin = span * 0.1;
    if (current < min + margin || current > max - margin) return "warn";
  }
  return "good";
}
