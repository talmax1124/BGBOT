const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { client, postFAQs, checkNewFaqs, handlePortalCommand } = require('./index');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(session({
    secret: 'superSecretKey123!',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: '/auth/discord/callback',
    scope: ['identify', 'guilds', 'guilds.members.read']
}, (accessToken, refreshToken, profile, done) => {
    profile.accessToken = accessToken;
    return done(null, profile);
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => res.redirect('/')
);

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

function ensureAuth(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');

    const guild = client.guilds.cache.first();
    guild.members.fetch(req.user.id).then(member => {
        const allowedRoles = ['mods', 'TIK TOK EXTERMINATOR'];
        const isAdmin = member.permissions.has('Administrator');
        const isOwner = member.id === guild.ownerId;
        const hasRole = member.roles.cache.some(r => allowedRoles.includes(r.name));

        if (isAdmin || isOwner || hasRole) return next();
        return res.status(403).send('Access denied.');
    }).catch(() => res.status(403).send('Not in server.'));
}

// ✅ Routes

app.get('/ping', (req, res) => {
    res.send({ status: '✅ Web portal is live' });
});

app.get('/channels', ensureAuth, (req, res) => {
    const channels = client.channels.cache
        .filter(channel => channel.type === 0)
        .map(channel => ({ id: channel.id, name: channel.name }));
    res.send(channels);
});

app.post('/submit-qa', ensureAuth, async (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) return res.status(400).send({ error: 'Missing question or answer' });

    const faqsPath = path.join(__dirname, 'faqs.json');
    const currentFaqs = fs.existsSync(faqsPath)
        ? JSON.parse(fs.readFileSync(faqsPath, 'utf-8'))
        : [];

    const alreadyExists = currentFaqs.some(([q, a]) => q === question && a === answer);
    if (!alreadyExists) {
        currentFaqs.push([question, answer]);
        fs.writeFileSync(faqsPath, JSON.stringify(currentFaqs, null, 2));
    }

    console.log('📩 Q&A Submitted:', { question, answer });
    res.send({ status: alreadyExists ? 'Already exists' : '✅ New FAQ saved' });
});

app.post('/send-command', ensureAuth, async (req, res) => {
    const { command, channelId } = req.body;
    const channel = client.channels.cache.get(channelId || process.env.COMMAND_CHANNEL_ID);

    if (!channel) return res.status(400).send({ error: 'Invalid channel ID' });

    channel.send(`🛰️ Command from portal: \`${command}\``)
        .then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000))
        .finally(() => handlePortalCommand(command, channel.id));

    res.send({ status: `✅ Executed: ${command}` });
});

app.post('/rename-command', ensureAuth, (req, res) => {
    const { oldName, newName, channelId } = req.body;
    const channel = client.channels.cache.get(channelId || process.env.COMMAND_CHANNEL_ID);

    if (channel) {
        channel.send(`🔁 Rename command:\n\`${oldName}\` ➡️ \`${newName}\``);
    }

    res.send({ status: 'Command name updated' });
});

app.listen(PORT, () => {
    console.log(`🌐 Web portal listening on port ${PORT}`);
});

app.get('/user', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send({ error: 'Not logged in' });
    res.send(req.user);
  });