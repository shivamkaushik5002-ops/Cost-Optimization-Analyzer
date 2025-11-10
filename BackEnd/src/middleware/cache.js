const etag = require('etag');
const crypto = require('crypto');

/**
 * Generate ETag for response
 */
function generateETag(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return etag(str);
}

/**
 * Check if request has valid ETag (304 Not Modified)
 */
function checkETag(req, res, dataETag) {
  const ifNoneMatch = req.headers['if-none-match'];
  
  if (ifNoneMatch && ifNoneMatch === dataETag) {
    res.status(304).end();
    return true;
  }
  
  return false;
}

/**
 * Cache middleware
 */
function cacheMiddleware(maxAge = 300) {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
}

module.exports = {
  generateETag,
  checkETag,
  cacheMiddleware
};

