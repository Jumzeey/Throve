# Composio Google Docs MCP (Cursor)

Use this so the agent can create/edit Google Docs directly (e.g. the Live video streaming report).

## One-time setup

1. Create a free Composio account: https://dashboard.composio.dev/login
2. Open **AI Clients** in the Composio dashboard and copy your **consumer API key**
3. In this repo, open `.cursor/mcp.json` and replace `YOUR_COMPOSIO_API_KEY` with that key
4. Restart Cursor (or reload MCP servers)
5. Go to **Cursor Settings → MCP**
6. Find **composio** → click **Connect** / Authenticate
7. Authorize **Google Docs** when prompted

## Then ask the agent

After auth succeeds, you can say things like:

- Create a Google Doc from `files/LIVE_VIDEO_STREAMING_ANDROID.md`
- Title it “Throve Live — Android Video Streaming Configuration”

## Notes

- Do **not** commit a real API key. Keep `.cursor/` local/untracked (or use a user-level `~/.cursor/mcp.json` instead).
- Without the API key header, Composio returns “Missing authentication”.
- Until Google OAuth is completed, the agent cannot create Docs in your Drive.
