const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

/**
 * Transcribe a Blob video by uploading to the backend.
 * @param {string} blobUrl - URL.createObjectURL(videoBlob)
 * @param {string} fileName - name of the file (e.g. 'video.mp4')
 * @returns {Promise<Object>} transcription data
 */
export async function transcribeBlob(blobUrl, fileName) {
  const resp = await fetch(blobUrl);
  if (!resp.ok) {
    throw new Error(`Failed to fetch blob: ${resp.statusText}`);
  }
  const blob = await resp.blob();
  const formData = new FormData();
  formData.append('file', blob, fileName);
  const response = await fetch(`${BASE_URL}/transcribe/`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Transcription failed');
  }
  return response.json();
}

/**
 * Transcribe a static file already on the server.
 * @param {string} filePath - Path relative to public root (e.g. '/video.mp4')
 * @param {Object} options - Additional transcription options
 * @returns {Promise<Object>} transcription data
 */
export async function transcribeFile(filePath, options = {}) {
  const payload = {
    file_path: filePath,
    model_name: options.model_name || 'medium',
    compute_type: options.compute_type || 'float32',
    batch_size: options.batch_size || 8
  };
  const response = await fetch(`${BASE_URL}/transcribe-file/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Transcription failed');
  }
  return response.json();
}