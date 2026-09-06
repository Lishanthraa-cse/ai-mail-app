const { google } = require('googleapis');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User.js');

// Configure Gmail OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Passport Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI,
    scope: ['email', 'profile', 'https://www.googleapis.com/auth/gmail.modify']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      
      if (!user) {
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          accessToken,
          refreshToken,
          picture: profile.photos[0]?.value
        });
        await user.save();
        console.log('👤 New user created:', user.email);
      } else {
        user.accessToken = accessToken;
        user.refreshToken = refreshToken;
        await user.save();
        console.log('👤 User logged in:', user.email);
      }
      
      return done(null, user);
    } catch (error) {
      console.error('❌ Google strategy error:', error);
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Helper to get Gmail client
const getGmailClient = async (user) => {
  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken
  });

  // Refresh token if expired
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      user.refreshToken = tokens.refresh_token;
      user.save();
    }
    if (tokens.access_token) {
      user.accessToken = tokens.access_token;
      user.save();
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

module.exports = { oauth2Client, getGmailClient };