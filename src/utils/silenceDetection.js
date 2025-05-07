/**
 * Detect silent gaps in transcription segments exceeding threshold.
 * @param {Object} transcription - { segments: [ { start, end, words: [ { start, end } ] } ] }
 * @param {number} duration - total duration of the media
 * @param {number} threshold - minimum gap length in seconds
 * @returns {Array} silence regions: { id, start, end, color, handleStyle, timestamp }
 */
export function detectSilencesCore(transcription, duration, threshold) {
  if (!transcription?.segments?.length || threshold <= 0) {
    return [];
  }
  const silences = [];
  const rgba = 'rgba(255, 165, 0, 0.3)';
  const handleStyle = { left: { backgroundColor: '#FFA500' }, right: { backgroundColor: '#FFA500' } };
  // Check before first word
  const firstSeg = transcription.segments[0];
  const firstWord = firstSeg.words?.[0];
  if (firstWord && firstWord.start >= threshold) {
    const midpoint = (0 + firstWord.start) / 2;
    silences.push({
      id: `silence-${midpoint.toFixed(3)}`,
      start: 0,
      end: firstWord.start,
      color: rgba,
      handleStyle,
      timestamp: new Date().toISOString()
    });
  }
  // Between words
  transcription.segments.forEach((segment, si) => {
    const words = segment.words || [];
    words.forEach((word, wi) => {
      const nextWord = (wi < words.length - 1)
        ? words[wi + 1]
        : transcription.segments[si + 1]?.words?.[0];
      if (nextWord) {
        const gap = nextWord.start - word.end;
        if (gap >= threshold) {
          const midpoint = (word.end + nextWord.start) / 2;
          silences.push({
            id: `silence-${midpoint.toFixed(3)}`,
            start: word.end,
            end: nextWord.start,
            color: rgba,
            handleStyle,
            timestamp: new Date().toISOString()
          });
        }
      }
    });
  });
  // After last word
  const lastSeg = transcription.segments[transcription.segments.length - 1];
  const lastWord = lastSeg.words?.[lastSeg.words.length - 1];
  if (lastWord && duration - lastWord.end >= threshold) {
    const midpoint = (lastWord.end + duration) / 2;
    silences.push({
      id: `silence-${midpoint.toFixed(3)}`,
      start: lastWord.end,
      end: duration,
      color: rgba,
      handleStyle,
      timestamp: new Date().toISOString()
    });
  }
  return silences;
}

/**
 * Adjusts the start and end times of silence regions with a specified padding.
 * This helps prevent cutting off words by making the silence region slightly shorter.
 * @param {Array} silences - Array of silence objects from detectSilencesCore.
 * @param {number} padding - The amount of padding (in seconds) to apply to start and end.
 * @returns {Array} A new array of adjusted silence regions. Filters out silences
 *                  that become invalid (duration <= 0) after padding.
 */
export function adjustSilencesWithPadding(silences, padding, minSilenceDuration = 0.5) {
  // Ensure valid inputs. If not, return the original silences array.
  if (!Array.isArray(silences) || typeof padding !== 'number' || padding < 0) {
    console.warn('Invalid input to adjustSilencesWithPadding, returning original silences.');
    return silences;
  }

  console.log('[adjustSilencesWithPadding] Input silences:', JSON.parse(JSON.stringify(silences)));
  console.log('[adjustSilencesWithPadding] Padding value:', padding);

  // Map over silences to adjust times, then filter out any invalid ones.
  const adjustedSilences = silences.map((silence, index) => {
    console.log(`[adjustSilencesWithPadding] Processing silence #${index + 1}: Original start=${silence.start}, end=${silence.end}`);
    // Calculate the new start and end times with padding.
    const newStart = silence.start + padding;
    const newEnd = silence.end - padding;
    const gap = newEnd - newStart;
    console.log(`[adjustSilencesWithPadding] Silence #${index + 1}: Calculated newStart=${newStart}, newEnd=${newEnd}`);

    // If the new start time is less than the new end time, the region is still valid.
    if (newStart < newEnd && gap >= minSilenceDuration) {
      // Return a new silence object with the adjusted times,
      // preserving all other properties like id, color, etc.
      const adjustedSilence = {
        ...silence,
        start: newStart,
        end: newEnd,
      };
      console.log(`[adjustSilencesWithPadding] Silence #${index + 1}: Kept and adjusted:`, JSON.parse(JSON.stringify(adjustedSilence)));
      return adjustedSilence;
    }
    // If the region becomes invalid (e.g., start >= end), mark it for removal.
    console.log(`[adjustSilencesWithPadding] Silence #${index + 1}: Filtered out (newStart >= newEnd).`);
    return null;
  }).filter(Boolean); // Filter out the null entries (invalidated regions).

  console.log('[adjustSilencesWithPadding] Returned adjusted silences:', JSON.parse(JSON.stringify(adjustedSilences)));
  return adjustedSilences;
}