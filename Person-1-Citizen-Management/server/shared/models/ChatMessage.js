import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, trim: true },
    modelUsed: { type: String, default: '' },
    fallbackUsed: { type: Boolean, default: false },
    actionType: {
      type: String,
      enum: ['none', 'status_lookup', 'complaint_created'],
      default: 'none'
    },
    actionData: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true, collection: 'chatMessages' }
);

export const ChatMessage =
  mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);
