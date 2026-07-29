const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { queryOne, runStatement } = require('../db/init');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Regenerate session to prevent session fixation
  req.session.regenerate(function(err) {
    if (err) {
      return res.status(500).json({ error: 'Session error' });
    }
    
    req.session.user = {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin
    };
    
    // Explicitly save session before responding
    req.session.save(function(err) {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session save error' });
      }
      
      res.json({ 
        success: true, 
        user: { username: user.username, is_admin: user.is_admin } 
      });
    });
  });
});

// Check session
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});



module.exports = router;
