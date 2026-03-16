import { Router } from 'express';
import { google } from 'googleapis';

const router = Router();

// In-memory token store (keyed by a random state string)
const tokenStore = new Map();

function makeOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// GET /auth/google
// Redirects to Google OAuth consent screen
router.get('/google', (req, res) => {
  const oauth2Client = makeOAuthClient();
  const state = Math.random().toString(36).slice(2);
  tokenStore.set(state, null); // reserve the slot

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    state,
    prompt: 'consent'
  });

  res.redirect(url);
});

// GET /auth/google/callback
// Exchanges code for tokens, fetches tomorrow's calendar events, responds with postMessage HTML
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;

  const oauth2Client = makeOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  tokenStore.set(state, tokens);

  // Tomorrow's date range in UTC (Google Calendar accepts RFC3339)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const timeMin = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0).toISOString();
  const timeMax = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59).toISOString();

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime'
  });

  const events = (response.data.items || []).map(e => ({
    summary: e.summary || '(No title)',
    start: e.start,
    end: e.end
  }));

  // Close the popup and send events back to the opener via postMessage
  res.send(`<!DOCTYPE html>
<html>
<body>
<script>
  window.opener.postMessage({ type: 'GOOGLE_CALENDAR_EVENTS', events: ${JSON.stringify(events)} }, '*');
  window.close();
</script>
</body>
</html>`);
});

export default router;
