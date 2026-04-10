import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
})

export const uploadImage = async (fileBuffer, folder = 'ozkan3d') => {
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
  return await cloudinary.uploader.destroy(publicId)
}

export const getPublicId = (imageUrl) => {
  const parts = imageUrl.split('/')
  const filename = parts[parts.length - 1]
  const folder = parts[parts.length - 2]
  return `${folder}/${filename.split('.')[0]}`
}