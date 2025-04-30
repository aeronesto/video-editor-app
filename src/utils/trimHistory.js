/**
 * Merge existing trim regions with new ones, avoiding duplicates and merging overlaps.
 * @param {Array} existingItems - Array of {id, start, end, ...}
 * @param {Array} newItems - Array of {id, start, end, ...}
 * @returns {Array} merged trim items
 */
export function mergeTrimItems(existingItems, newItems) {
  // Combine and dedupe by id or identical start/end
  const all = [...existingItems];
  newItems.forEach(item => {
    const dup = all.some(e =>
      e.id === item.id ||
      (Math.abs(e.start - item.start) < 0.001 && Math.abs(e.end - item.end) < 0.001)
    );
    if (!dup) {
      all.push(item);
    }
  });
  // Sort by start time
  all.sort((a, b) => a.start - b.start);
  // Merge overlapping intervals
  const merged = [];
  for (const item of all) {
    if (merged.length === 0) {
      merged.push({ ...item });
    } else {
      const last = merged[merged.length - 1];
      if (last.end >= item.start) {
        // overlap: extend
        last.end = Math.max(last.end, item.end);
        last.start = Math.min(last.start, item.start);
        last.id = `merged-${last.start.toFixed(3)}-${last.end.toFixed(3)}`;
      } else {
        merged.push({ ...item });
      }
    }
  }
  return merged;
}