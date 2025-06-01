const https = require('https');
const fs = require('fs');
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Replace these placeholders with your app's credentials
const CLIENT_ID = 'qZrVhEMunOcUsryOenTHMxkI_HKc9diMuSeYsaPs10I';
const CLIENT_SECRET = 'wTUs_o0uGqH8tG0DV3OQfQkxQ3BhAoLTAE6vyyPXNqo';
const REDIRECT_URI = 'https://localhost:3000/callback';
const AUTH_URL = 'https://api.wahooligan.com/oauth/authorize';
const TOKEN_URL = 'https://api.wahooligan.com/oauth/token';
const SCOPES = 'user_read workouts_read workouts_write plans_read plans_write power_zones_read';

// Load SSL certificate and private key (update paths as needed)
const SSL_OPTIONS = {
  key: fs.readFileSync('./ssl/server.key'), // Path to private key
  cert: fs.readFileSync('./ssl/server.crt') // Path to certificate
};

// Step 1: Redirect user to the authorization page
app.get('/auth', (req, res) => {
  const authURL = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(SCOPES)}`;
  console.log(authURL);
  res.redirect(authURL);
});

// Step 2: Handle the callback and exchange the code for a token
app.get('/callback', async (req, res) => {
  const authorizationCode = req.query.code;

  if (!authorizationCode) {
    return res.status(400).send('Authorization code is missing');
  }

  try {
    const response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    res.json({
      message: 'Token retrieved successfully',
      access_token,
      refresh_token,
      expires_in
    });
  } catch (error) {
    console.error('Error exchanging authorization code:', error.response?.data || error.message);
    res.status(500).send('Failed to retrieve access token');
  }
});

// Create HTTPS server
https.createServer(SSL_OPTIONS, app).listen(PORT, () => {
  console.log(`HTTPS server is running on https://localhost:${PORT}`);
  console.log(`Start the authentication process at https://localhost:${PORT}/auth`);
});
