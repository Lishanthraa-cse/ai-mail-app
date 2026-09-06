const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gmailId: {
    type: String,
    required: true,
    unique: true
  },
  threadId: String,
  from: {
    email: String,
    name: String
  },
  to: [{
    email: String,
    name: String
  }],
  subject: String,
  body: String,
  snippet: String,
  date: Date,
  isRead: {
    type: Boolean,
    default: false
  },
  labels: [String],
  syncedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
EmailSchema.index({ userId: 1, date: -1 });
EmailSchema.index({ userId: 1, isRead: 1 });
EmailSchema.index({ userId: 1, 'from.email': 1 });

module.exports = mongoose.model('Email', EmailSchema);