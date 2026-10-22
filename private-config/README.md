# DTS AI — Private API Key Setup

**Never paste API keys into this folder or commit them to GitHub.** This folder contains instructions only; Render does not automatically read secrets from repository files.

## Add the backup provider key safely

1. Open the Render service dashboard: https://dashboard.render.com/web/srv-dal2p9ijnfac73c97qsg
2. Open **Environment**.
3. Add or update the environment variable:
   - Key: `GROQ_API_KEY`
   - Value: paste your Groq API key here in Render (not in GitHub or ChatGPT).
4. Save changes and let Render redeploy/restart the service.
5. Test the website chat and confirm the backup works before deleting or revoking any old key.

The app's failover code can only use providers whose API keys are configured and whose free-tier service is available. A second key does not guarantee unlimited free quota.
