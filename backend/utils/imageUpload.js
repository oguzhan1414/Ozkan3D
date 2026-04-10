import { v2 as cloudinary } from 'cloudinary'

const getCloudinaryConfig = () => {
  const cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD || '').trim()
  const api_key = (process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY || '').trim()
  const api_secret = (process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET || '').trim()

  return { cloud_name, api_key, api_secret }
}

const ensureCloudinaryConfig = () => {
  const config = getCloudinaryConfig()

  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    const missing = [
      !config.cloud_name ? 'CLOUDINARY_CLOUD_NAME' : null,
      !config.api_key ? 'CLOUDINARY_API_KEY' : null,
      !config.api_secret ? 'CLOUDINARY_API_SECRET' : null,
    ].filter(Boolean)

    const error = new Error(`Cloudinary ayarlari eksik: ${missing.join(', ')}`)
    error.statusCode = 500
    throw error
  }

  cloudinary.config(config)
}

export const uploadImage = async (fileBuffer, folder = 'ozkan3d') => {
  ensureCloudinaryConfig()

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    uploadStream.end(fileBuffer)
  })
}

export const deleteImage = async (publicId) => {
  ensureCloudinaryConfig()
  return await cloudinary.uploader.destroy(publicId)
}

export const getPublicId = (imageUrl) => {
  const parts = imageUrl.split('/')
  const filename = parts[parts.length - 1]
  const folder = parts[parts.length - 2]
  return `${folder}/${filename.split('.')[0]}`
}