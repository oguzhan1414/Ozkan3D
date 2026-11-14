// backend/.env'i, komut hangi klasörden çalıştırılırsa çalıştırılsın yükler.
// Diğer modüllerden ÖNCE import edilmeli. Vercel'de değişkenler platformdan gelir;
// dotenv mevcut değişkenleri ezmez.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(backendDir, '.env'), quiet: true })
