import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Ürün adı zorunludur'], trim: true },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String },
  shortDesc: { type: String },
  category: { type: String, required: [true, 'Kategori zorunludur'] },
  subcategory: { type: String },
  price: { type: Number, required: [true, 'Fiyat zorunludur'], min: [0, 'Fiyat 0dan küçük olamaz'] },
  oldPrice: { type: Number },
  stock: { type: Number, required: [true, 'Stok zorunludur'], min: [0, 'Stok 0dan küçük olamaz'], default: 0 },
  sku: { type: String, unique: true, sparse: true },
  images: [{ type: String }],
  material: [{ type: String }],
  colors: [{ type: String }],
  badge: { type: String, enum: ['Yeni', 'İndirim', 'Çok Satan', null], default: null },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  // Teknik Detaylar
  weight: { type: Number },
  dimensions: {
    width: { type: Number },
    height: { type: Number },
    depth: { type: Number },
  },
  printTime: { type: Number },
  difficulty: { type: String, enum: ['Kolay', 'Orta', 'Zor'], default: 'Orta' },

  // SEO
  metaTitle: { type: String },
  metaDesc: { type: String },
  tags: [{ type: String }],
}, { timestamps: true })

productSchema.index({ name: 'text', description: 'text', tags: 'text' })
productSchema.index({ category: 1, price: 1, rating: -1 })

export default mongoose.model('Product', productSchema)