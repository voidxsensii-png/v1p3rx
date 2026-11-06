# V1p3rx — Minecraft PvP Clan Bot

Custom Discord bot for a competitive Minecraft PvP clan. Node.js + TypeScript + discord.js v14 + SQLite.
Black / dark-gray / blood-red (`#8B0000`) embed identity on every message.

## Status (Phase 1)

| Area | State |
|---|---|
| Moderation: `/ban /unban /kick /timeout /untimeout /warn /warnings /clear /purge /lock /unlock /slowmode /modlogs` | ✅ built |
| Case numbering, mod-log channel, warning thresholds (auto-timeout / auto-ban) | ✅ built |
| Automod: anti-spam, anti-link, anti-mention-spam, anti-raid | ✅ built |
| Permission levels (Owner → Guest) mapped to Discord roles via `/config role` | ✅ built |
| AI chat (Anthropic or any OpenAI-compatible API), per-channel, injection guards | ✅ built |
| Welcome / goodbye embeds, auto-role, member count | ✅ built (no generated images) |
| Clan: `/register`, `/profile`, `/roster`, activity tracking | ✅ built |
| Utility: `/help /ping /userinfo /serverinfo /avatar /botinfo /invite` | ✅ built |
| `/poll /suggest /leaderboard` | ⏳ Phase 2 |
| Tickets (5 types, claim/close/transcripts) | ⏳ Phase 2 |
| Applications, rank promote/demote, announcements, clan stats | ⏳ Phase 2 |
| Scrims, tournaments, results, leaderboards | ⏳ Phase 3 |
| Web dashboard (Discord OAuth2) | ⏳ Phase 4 |

Verified so far: TypeScript compiles cleanly, DB migrations are idempotent, all command definitions build,
case numbering / permission levels / IGN uniqueness pass a local smoke test. **Not yet tested against a live Discord server** — test on a private server first.

## Permission model

Levels: Guest < Member < Trial Moderator < Moderator < Admin < Manager < Co-Owner < Owner.
The **server owner is always Owner**. Everyone else gets the highest level among the roles you map with
`/config role`. Discord's own "Administrator" permission does *not* grant bot permissions.
Minimums: Trial Mod = `/warn /warnings /modlogs` · Moderator = kick, timeout, clear, purge, lock, slowmode · Admin = ban, unban, `/config`.

## 1. Discord Developer Portal

1. https://discord.com/developers/applications → **New Application** (name it V1p3rx).
2. **Bot** tab → *Reset Token* → copy it (this is `DISCORD_TOKEN`). Never share or commit it.
3. Same tab → enable **Server Members Intent** and **Message Content Intent**.
4. **General Information** → copy **Application ID** (this is `CLIENT_ID`).
5. Invite the bot with this link (replace `CLIENT_ID`):
   `https://discord.com/oauth2/authorize?client_id=CLIENT_ID&permissions=1099780156438&scope=bot%20applications.commands`
6. In your server, drag the **V1p3rx role above** any role it needs to moderate.

## 2. Push to GitHub

```bash
git init && git add . && git commit -m "V1p3rx phase 1"
git branch -M main
git remote add origin https://github.com/<you>/v1p3rx.git
git push -u origin main
```
`.env` and `data/` are git-ignored — secrets never go in the repo.

## 3. Deploy on Railway (24/7)

1. https://railway.com → **New Project → Deploy from GitHub repo** → pick the repo.
2. Open the service → **Variables** and add: `DISCORD_TOKEN`, `CLIENT_ID`, `DATA_DIR=/data`
   (optional: `DEV_GUILD_ID`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`).
3. **Add a Volume** (service → Settings/Volumes) mounted at **`/data`**. Without it the SQLite database
   is wiped on every redeploy.
4. Deploy. Logs should show `V1p3rx online as ...`. Every push to `main` redeploys automatically.
5. Slash commands register automatically on boot (only when they changed). Use `DEV_GUILD_ID` for instant updates while testing.

Railway is a container host, not a VM, but it keeps the bot running 24/7 and restarts it on crashes (see `railway.json`).

## 4. First-time setup in Discord

```
/config role level:Owner role:@Owner      (server owner runs this first)
/config role level:Admin role:@Admin
/config role level:Moderator role:@Mod
/config channel type:Mod logs channel:#mod-logs
/config channel type:Welcome channel:#welcome
/config welcome role:@Member message:Welcome {user} to {server}! You're #{count}.
/config ai-channel action:Add channel:#chat
/config view
```

## Run locally

```bash
cp .env.example .env     # fill in DISCORD_TOKEN and CLIENT_ID
npm install
npm run dev              # or: npm run build && npm start
npm run register         # force-register slash commands
```
Windows / Linux VPS / Pterodactyl: Node 20+, run `npm install && npm run build`, startup command `npm start`.

## Troubleshooting

- **Bot online but no slash commands**: wait up to an hour for global commands, or set `DEV_GUILD_ID`. Make sure the invite included `applications.commands`.
- **`Used disallowed intents`**: enable Server Members + Message Content intents in the Portal.
- **"I'm missing permissions"**: move the V1p3rx role above the target's top role.
- **Settings/warnings vanish after redeploy**: the Railway Volume is missing or `DATA_DIR` isn't `/data`.
- **AI never answers**: set `AI_API_KEY`, then mention the bot or add the channel with `/config ai-channel`.
- **better-sqlite3 build error**: use Node 20 or 22 LTS.
