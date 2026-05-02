# Chrome Extension Installation Guide

## Prerequisites

- Google Chrome (version 88+)
- The web app deployed or running locally (default: http://localhost:3000)
- A family account created in the web app

## Installation Steps

### 1. Open Chrome Extensions

Navigate to `chrome://extensions/` in your browser.

### 2. Enable Developer Mode

Toggle **Developer mode** switch in the top-right corner.

### 3. Load the Extension

Click **Load unpacked** button. Select the `extension/` directory from this project.

You should see "Family Digital Agreement" appear in your extensions list with its icon.

### 4. Pin the Extension (Optional)

Click the puzzle piece icon in Chrome's toolbar, find "Family Digital Agreement", and click the pin icon to keep it visible.

## Configuration

### Getting Your Credentials

1. Log into your Family Digital Agreement web app
2. Navigate to the dashboard
3. Open browser DevTools (F12) and go to **Application** > **Storage** > **Local Storage**
4. Find your Supabase auth token (advanced). Alternatively, we'll add a Settings page soon.

**For now, you can retrieve IDs from Supabase**:
- **User ID**: In Supabase table `users`, find your row; copy the `id` (UUID)
- **Family ID**: In same row, copy `family_id` (UUID)

These will be displayed in a future Settings page.

### Setting Up the Extension

1. Click the extension icon in the toolbar
2. Enter your **Web App URL** (e.g., `http://localhost:3000` or `https://your-app.vercel.app`)
3. Paste your **User ID** and **Family ID**
4. Click **Save Configuration**
5. Toggle **Enable tracking** to ON

You should see "Extension configured and ready" status.

## How It Works

The extension runs in the background and monitors your browsing activity (all tabs except Chrome internal pages). Every 30 seconds, it sends a visit record to your web app's API endpoint.

### What Gets Logged

- URL
- Page title
- Domain
- Visit start time
- Duration (total time spent)
- Auto-categorized content type (social, gaming, education, etc.)
- Whether the visit was blocked by a rule (if rules are set)

### Visibility

All logged data is **fully transparent**:
- Parents can see everything on the dashboard
- Child accounts have the same view (they can see their own tracking)
- No hidden or private logs exist

## Uninstall

To remove the extension:
1. Go to `chrome://extensions/`
2. Find "Family Digital Agreement"
3. Click **Remove**

Your data remains in the web app; you can continue to access it via the dashboard.

## Troubleshooting

**"Configuration not saved" error**
- Ensure the web app URL is correct and accessible from your browser
- The extension must be able to reach the `/api/visits` endpoint
- If using localhost, ensure the server is running

**No visits appearing in dashboard**
- Verify the extension is enabled (toggle ON)
- Check that you're logged into the web app with the same account configured in extension
- Open Chrome DevTools > Console while on extension popup to see errors

** visits delayed**
- The extension sends data every 30 seconds while page stays open
- Tab must be active (foreground) for tracking
- Closing a tab flushes the current visit

## Development

To modify the extension:

- Edit `extension/background.js` – service worker logic
- Edit `extension/popup.html` and `extension/popup.js` – configuration UI
- After changes, go to `chrome://extensions/` and click the **Refresh** button on the extension card

The extension icons in `extension/icons/` are minimal placeholder PNGs. Replace with your own branding as needed (16x16, 48x48, 128x128 PNGs).

## Next Steps

- Add a Settings page in the web app to automatically display user/family IDs
- Implement real-time updates for new visits
- Add more granular rule types
- Create family invite codes (instead of manual ID sharing)
