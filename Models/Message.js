// backend/models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  from: String,
  to: String,
  body: String,
  timestamp: { type: Date, default: Date.now },
  direction: { type: String, enum: ['inbound', 'outbound'] },
});

// Force use of existing collection name 'Whatsapp'
export default mongoose.model('Message', messageSchema, 'Whatsapp');
