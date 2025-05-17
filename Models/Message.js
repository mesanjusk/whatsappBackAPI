// backend/models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sessionId: String,
  from: String,
  to: String,
  body: String,
  direction: String,
  timestamp: Date,
});


// Force use of existing collection name 'Whatsapp'
export default mongoose.model('Message', messageSchema);

