import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const addressSchema = new mongoose.Schema({
  title: { type: String, default: 'Ev' },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  neighborhood: { type: String },
  address: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
})

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Ad zorunludur'],
    trim: true,
    maxlength: [30, 'Ad 30 karakterden uzun olamaz'],
  },
  lastName: {
    type: String,
    required: [true, 'Soyad zorunludur'],
    trim: true,
    maxlength: [30, 'Soyad 30 karakterden uzun olamaz'],
  },
  email: {
    type: String,
    required: [true, 'E-posta zorunludur'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Geçerli bir e-posta adresi giriniz'],
  },
  password: {
    type: String,
    required: [true, 'Şifre zorunludur'],
    minlength: [8, 'Şifre en az 8 karakter olmalıdır'],
    select: false,
  },
  favorites : [{
    type : mongoose.Schema.Types.ObjectId,
    ref : 'Product' 
  }],
  phone: {
    type: String,
    trim: true,
  },
  birthDate: {
    type: Date,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  addresses: [addressSchema],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true })

// Virtual — full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`
})

// Şifre hashle
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})
// Şifre karşılaştır
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Doğum günü kontrolü — doğum günündeyse true döner
userSchema.methods.isBirthday = function () {
  if (!this.birthDate) return false
  const today = new Date()
  const birth = new Date(this.birthDate)
  return today.getDate() === birth.getDate() && today.getMonth() === birth.getMonth()
}

export default mongoose.model('User', userSchema)