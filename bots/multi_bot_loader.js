const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const botsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/userBots.json'), 'utf-8')).bots;
const activeBots = {};

for (const [guildId, botInfo] of Object.entries(botsData)) {
    const folder = botInfo.folder;

    if (!folder) {
        console.error(`❌ No folder specified for bot "${botInfo.name}" (guildId: ${guildId}) in userBots.json`);
        continue;
    }

    const botPath = path.join(__dirname, folder, 'index.js');

    if (!fs.existsSync(botPath)) {
        console.error(`❌ Bot index file not found: ${botPath}`);
        continue;
    }

    if (!botInfo.token) {
        console.error(`❌ No token found for bot "${botInfo.name}" (guildId: ${guildId}). Check /config/userBots.json`);
        continue;
    }

    console.log(`📦 Loading bot from folder: ${folder}`);

    try {
        const bot = require(botPath);

        bot.client.login(botInfo.token)
            .then(() => {
                console.log(`✅ Logged in as ${bot.client.user.tag} for server ${guildId}`);
                activeBots[guildId] = bot.client;
            })
            .catch(err => {
                console.error(`❌ Failed to login ${botInfo.name}:`, err.message);
            });

    } catch (err) {
        console.error(`❌ Failed to load bot in folder "${folder}":`, err.message);
    }
}

module.exports = { activeBots };