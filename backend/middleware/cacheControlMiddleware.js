const mergeVaryHeader = (currentValue, appendValue) => {
  const current = (currentValue || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const next = appendValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return Array.from(new Set([...current, ...next])).join(', ')
}

const hasAuthContext = (req) => {
  return Boolean(req.headers.authorization || req.cookies?.token)
}

export const withPublicCache = (maxAgeSeconds = 60, staleWhileRevalidateSeconds = 60) => {
  const maxAge = Number(maxAgeSeconds) || 60
  const staleWhileRevalidate = Number(staleWhileRevalidateSeconds) || 60

  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }

    if (!hasAuthContext(req)) {
      res.set(
        'Cache-Control',
        `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
      )
    }

    const varyValue = mergeVaryHeader(res.get('Vary'), 'Accept-Encoding, Origin')
    if (varyValue) {
      res.set('Vary', varyValue)
    }

    next()
  }
}
