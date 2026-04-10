const notFound = (req, res, next) => {
  const error = new Error(`Bulunamadı: ${req.originalUrl}`)
  res.status(404)
  next(error)
}

const errorHandler = (err, req, res, next) => {
  const explicitStatus = err.statusCode || err.status
  const statusCode = explicitStatus || (res.statusCode === 200 ? 500 : res.statusCode)

  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${err.message}`)
    if (err.stack) {
      console.error(err.stack)
    }
  }

  res.status(statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export { notFound, errorHandler }