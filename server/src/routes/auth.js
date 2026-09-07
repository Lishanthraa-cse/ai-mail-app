const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Google OAuth login
router.get('/google', passport.authenticate('google', {
  scope: ['email', 'profile', 'https://www.googleapis.com/auth/gmail.modify']
}));

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: 'http://localhost:3000/login',
    session: true 
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user.id, email: req.user.email },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );
      
      res.redirect(`http://localhost:3000/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect('http://localhost:3000/login?error=auth_failed');
    }
  }
);

// Get current user
router.get('/me', (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;