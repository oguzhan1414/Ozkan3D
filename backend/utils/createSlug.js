import slugify from 'slugify'
import Product from '../models/Product.js'

export const createSlug = async (name, model = Product) => {
  let slug = slugify(name, {
    lower: true,
    strict: true,
    locale: 'tr',
  })

  // Aynı slug varsa sonuna numara ekle
  let slugExists = await model.findOne({ slug })
  let counter = 1

  while (slugExists) {
    slug = `${slug}-${counter}`
    slugExists = await model.findOne({ slug })
    counter++
  }

  return slug
}