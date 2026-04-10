import mongoose from 'mongoose'

const supportRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000,
  },
  attachmentUrl: {
    type: String,
  },
  attachmentName: {
    type: String,
  },
  status: {
    type: String,
    enum: ['new', 'in-progress', 'resolved'],
    default: 'new',
  },
}, { timestamps: true })

export default mongoose.model('SupportRequest', supportRequestSchema)
