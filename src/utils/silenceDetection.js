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
    silences.push({
      id: `silence-0-${firstWord.start.toFixed(3)}`,
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
          silences.push({
            id: `silence-${word.end.toFixed(3)}-${nextWord.start.toFixed(3)}`,
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
    silences.push({
      id: `silence-${lastWord.end.toFixed(3)}-${duration}`,
      start: lastWord.end,
      end: duration,
      color: rgba,
      handleStyle,
      timestamp: new Date().toISOString()
    });
  }
  return silences;
}