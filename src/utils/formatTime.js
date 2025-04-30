/**
 * Format a time in seconds to MM:SS format.
 * @param {number} timeInSeconds
 * @returns {string}
 */
export function formatTime(timeInSeconds) {
  if (timeInSeconds == null || isNaN(timeInSeconds)) {
    return '00:00';
  }
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}