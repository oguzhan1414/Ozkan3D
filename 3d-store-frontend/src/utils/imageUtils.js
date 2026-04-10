/**
 * Optimizes a Cloudinary image URL by injecting 'f_auto,q_auto' 
 * formatting parameters to ensure it is served in next-gen formats 
 * (like WebP) and optimal quality.
 * 
 * @param {string} url - The original Cloudinary image URL
 * @returns {string} - The optimized URL
 */
export const optimizeImage = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('cloudinary.com')) return url;
  
  // If already contains optimization params, return as is
  if (url.includes('/f_auto') || url.includes(',f_auto') || url.includes('/q_auto')) {
    return url;
  }

  // Inject after /upload/
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
};
