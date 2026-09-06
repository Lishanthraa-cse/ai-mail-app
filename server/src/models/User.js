const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  picture: String,
  accessToken: String,
  refreshToken: String,
  preferences: {
    theme: {
      type: String,
      default: 'light'
    },
    defaultFilters: {
      unreadOnly: {
        type: Boolean,
        default: false
      },
      dateRange: {
        type: String,
        default: 'all'
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);