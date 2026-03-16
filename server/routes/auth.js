import { Router } from 'express';

const router = Router();

// GET /auth/google
// Starts the Google OAuth flow
router.get('/google', (req, res) => {
  // TODO: redirect to Google OAuth consent screen using passport or manual OAuth URL
});

// GET /auth/google/callback
// Handles the OAuth callback from Google, exchanges code for tokens, fetches calendar events
router.get('/google/callback', async (req, res) => {
  // TODO: exchange authorization code for access token
  // TODO: fetch user's Google Calendar events using the access token
  // TODO: return calendar events as JSON
});

export default router;
