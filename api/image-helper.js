/**
 * Image URL Helper
 * Converts external image URLs (Unsplash, Pexels) to local file paths
 * that are served by the Express middleware in server.js
 */

// Map of known Unsplash photo IDs → local file paths
const UNSPlASH_MAP = {
  'photo-1564540586988-aa4e53c3d799': '/images.unsplash.com/photo-1564540586988-aa4e53c3d799/w=1000&q=80',
  'photo-1607710533910-d7cdffd9e593': '/images.unsplash.com/photo-1607710533910-d7cdffd9e593/w=1000&q=80',
  'photo-1622372738946-62e02505feb3': '/images.unsplash.com/photo-1622372738946-62e02505feb3/w=1000&q=80',
  'photo-1623092242739-5a382879cec9': '/images.unsplash.com/photo-1623092242739-5a382879cec9/w=800&q=80',
  'photo-1656402887556-e727ffe1f6d7': '/images.unsplash.com/photo-1656402887556-e727ffe1f6d7/w=800&q=80',
  'photo-1663811396551-e639caee6e62': '/images.unsplash.com/photo-1663811396551-e639caee6e62/w=800&q=80',
};

// Map of known Pexels photo IDs → local file paths
const PEXELS_MAP = {
  '35189675': '/images.pexels.com/photos/35189675/pexels-photo-35189675_auto=compress&cs=tinysrgb&dpr=2&h=900&w=700.jpeg',
  '36081877': '/images.pexels.com/photos/36081877/pexels-photo-36081877_auto=compress&cs=tinysrgb&dpr=2&h=1200&w=1600.jpeg',
};

/**
 * Convert an external image URL to a local path if a local copy exists.
 * If no local copy exists, returns the original URL unchanged.
 */
function fixImageUrl(url) {
  if (!url || typeof url !== 'string') return url || '';

  // Already a local path, return as-is
  if (url.startsWith('/')) return url;

  // Match Unsplash URLs: https://images.unsplash.com/photo-XXXXXXXXX?... 
  var unsplashMatch = url.match(/images\.unsplash\.com\/(photo-[a-zA-Z0-9_-]+)/);
  if (unsplashMatch && unsplashMatch[1]) {
    var local = UNSPlASH_MAP[unsplashMatch[1]];
    if (local) return local;
  }

  // Match Pexels URLs by photo ID
  var pexelsMatch = url.match(/pexels-photo-(\d+)/);
  if (pexelsMatch && pexelsMatch[1]) {
    var local = PEXELS_MAP[pexelsMatch[1]];
    if (local) return local;
  }

  // Unknown external URL, return as-is
  return url;
}

/**
 * Apply fixImageUrl to all image fields in an object
 */
function fixObjectImageUrls(obj, fields) {
  if (!obj) return obj;
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (obj[field] !== undefined && obj[field] !== null) {
      obj[field] = fixImageUrl(obj[field]);
    }
  }
  return obj;
}

/**
 * Apply fixImageUrl to image fields in an array of objects
 */
function fixArrayImageUrls(arr, fields) {
  if (!arr) return arr;
  for (var i = 0; i < arr.length; i++) {
    fixObjectImageUrls(arr[i], fields);
  }
  return arr;
}

module.exports = {
  fixImageUrl,
  fixObjectImageUrls,
  fixArrayImageUrls
};
