require('dotenv').config();
if (typeof fetch !== 'function') {
    global.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const DiscordStrategy = require('passport-discord').Strategy;
const fs = require('fs');
const path = require('path');
const { activeBots } = require('../bots/multi_bot_loader');

const userBots = JSON.parse(fs.readFileSync('./config/userBots.json', 'utf-8'));
const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '../public')));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        if (!accessToken) {
            console.error("❌ OAuth Token missing.");
            return done(new Error("OAuth token missing"), null);
        }
        console.log("✅ OAuth Token received:", accessToken);
        profile.accessToken = accessToken;
        return done(null, profile);
    } catch (err) {
        console.error("❌ OAuth Error:", err.response?.data || err.message);
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), async (req, res) => {
    if (req.query.error) {
        console.error("🚨 Discord OAuth Error:", req.query.error, req.query.error_description);
    }
    res.redirect('/dashboard');
});

app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

async function getUserGuilds(accessToken, retries = 3) {
    const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after'), 10) || 1;
        console.error(`⚠️ Rate limited! Retrying in ${retryAfter} seconds...`);
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return getUserGuilds(accessToken, retries - 1);
        } else {
            throw new Error("🚨 Too Many Requests: Exceeded retry limit.");
        }
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch user guilds: ${response.statusText}`);
    }

    return response.json();
}

app.get('/dashboard', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
});

app.get('/bot/:botId', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const botId = req.params.botId;
    if (!userBots.bots || !userBots.bots[botId]) return res.status(404).json({ error: "Bot not found" });

    res.json(userBots.bots[botId]);
});

app.get('/botlist', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("🔄 Fetching bot list for:", req.user.username);

    try {
        const userGuilds = await getUserGuilds(req.user.accessToken);
        if (!Array.isArray(userGuilds)) throw new Error("Invalid guilds response");
        const userAdminGuilds = userGuilds.filter(guild => (BigInt(guild.permissions) & BigInt(0x8)) === BigInt(0x8));

        if (!userBots.bots || typeof userBots.bots !== "object") {
            return res.status(500).json({ error: "Bot data is missing or incorrectly formatted." });
        }

        const userBotsList = userAdminGuilds
            .map(guild => userBots.bots[guild.id])
            .filter(bot => bot !== undefined);

        console.log("✅ Bots Found for User:", JSON.stringify(userBotsList, null, 2));
        res.json({ userBotsList });
    } catch (error) {
        console.error("🚨 Error fetching bot list:", error);
        res.status(500).json({ error: "Failed to fetch bot list." });
    }
});

// ✅ Get Enabled Features for a Bot
app.get('/features/:botId', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const botId = req.params.botId;
    const botData = userBots.bots[botId];

    if (!botData) return res.status(404).json({ error: "Bot not found" });

    const features = botData.commands || [];
    res.json({ features });
});

// ✅ Get Channels for a Bot
app.get('/bot/:botId/channels', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const botId = req.params.botId;
    const bot = activeBots[botId];

    if (!bot) return res.status(404).json({ error: "Bot is not connected." });

    try {
        const guild = bot.guilds.cache.get(botId);
        if (!guild) return res.status(404).json({ error: "Bot is not in the server." });

        await guild.channels.fetch();
        const channels = guild.channels.cache
            .filter(channel => channel.type === 0)
            .map(channel => ({ id: channel.id, name: channel.name }));

        res.json({ channels });
    } catch (err) {
        console.error("❌ Failed to fetch channels:", err);
        res.status(500).json({ error: "Failed to fetch channels." });
    }
});

// ✅ Submit a FAQ
app.post('/submit-faq', express.json(), (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const { botId, question, answer, channelId } = req.body;
    console.log("📝 Submitting FAQ:", { botId, question, answer, channelId });

    if (!question || !answer || !channelId || !botId) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    const bot = activeBots[botId];
    if (!bot) return res.status(404).json({ error: "Bot is not connected." });

    const botConfigEntry = Object.entries(userBots.bots).find(([id, data]) => id === botId);
    if (!botConfigEntry || !botConfigEntry[1]?.folder) {
        return res.status(400).json({ error: "Bot folder not found for this bot." });
    }
    const folderName = botConfigEntry[1].folder;
    const filePath = path.join(__dirname, `../bots/${folderName}/faqs.json`);

    let faqs = [];
    if (fs.existsSync(filePath)) {
        faqs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    faqs.push([question, answer]);
    fs.writeFileSync(filePath, JSON.stringify(faqs, null, 2));

    bot.channels.fetch(channelId)
        .then(channel => channel.send(`>>> 💭 **${question}**\n\n💡 ${answer}`))
        .then(() => res.json({ success: true }))
        .catch(err => {
            console.error("Failed to send FAQ:", err);
            res.status(500).json({ error: "Failed to send FAQ." });
        });
});

// ✅ Send Raw Command from Panel
app.post('/send-command', express.json(), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const { botId, channelId, command } = req.body;

    if (!botId || !channelId || !command) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    const bot = activeBots[botId];
    if (!bot) return res.status(404).json({ error: "Bot is not connected." });

    try {
        const fakeMessage = {
            content: command,
            channel: await bot.channels.fetch(channelId),
            guild: bot.guilds.cache.first(),
            member: {
                permissions: {
                    has: () => true
                }
            },
            author: { bot: false }
        };

        bot.emit('messageCreate', fakeMessage);
        res.json({ success: true });
    } catch (err) {
        console.error("Failed to send command:", err);
        res.status(500).json({ error: "Command execution failed." });
    }
});

app.get('/me', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not logged in" });
    res.json({ user: req.user });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log("🌐 Logging in via web.js (admin panel)");
    console.log(`🌐 Web portal listening on port ${PORT}`);
});
