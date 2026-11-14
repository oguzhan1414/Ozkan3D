// Vercel serverless function: tüm /api/* istekleri buraya yönlenir (vercel.json).
// Express uygulaması doğrudan handler olarak export edilir.
import app from '../backend/app.js'

export default app
