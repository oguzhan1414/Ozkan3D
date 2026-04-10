/**
 * Optimizes a Cloudinary image URL by injecting 'f_auto,q_auto' 
 * formatting parameters to ensure it is served in next-gen formats 
 * (like WebP) and optimal quality.
 * 
 * @param {string} url - The original Cloudinary image URL
 * @returns {string} - The optimized URL
 */
const getApiOrigin = () => {
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim()

  try {
    return new URL(apiBase).origin
  } catch {
    return 'http://localhost:5000'
  }
}

const normalizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url

  const trimmed = url.trim()
  const apiOrigin = getApiOrigin()

  if (trimmed.startsWith('/')) {
    return `${apiOrigin}${trimmed}`
  }

  try {
    const parsed = new URL(trimmed)
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

    if (localHosts.has(parsed.hostname)) {
      return `${apiOrigin}${parsed.pathname}${parsed.search}`
    }

    return trimmed
  } catch {
    if (trimmed.startsWith('uploads/')) {
      return `${apiOrigin}/${trimmed}`
    }
    return trimmed
  }
}

export const optimizeImage = (url) => {
  if (!url || typeof url !== 'string') return url

  const normalizedUrl = normalizeImageUrl(url)
  if (!normalizedUrl.includes('cloudinary.com')) return normalizedUrl
  
  // If already contains optimization params, return as is
  if (normalizedUrl.includes('/f_auto') || normalizedUrl.includes(',f_auto') || normalizedUrl.includes('/q_auto')) {
    return normalizedUrl
  }

  // Inject after /upload/
  return normalizedUrl.replace('/upload/', '/upload/f_auto,q_auto/')
}
