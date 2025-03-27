require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const botConfigPath = path.resolve(__dirname, '../../config/userBots.json');
const userBots = require(botConfigPath).bots;

const matchedEntry = Object.entries(userBots).find(([_, config]) => config.folder === 'bgbot');

if (!matchedEntry) {
    console.error(`❌ No matching config entry found for folder "bgbot"`);
    process.exit(1);
}

const [serverId, botConfig] = matchedEntry;
const botName = botConfig.name || "Unnamed Bot";

if (!botConfig.token) {
    console.error(`❌ No token found for ${botName} in config. Check ${botConfigPath}`);
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Normalize command names for easier checking
const normalizeCommandNames = () => {
    return (botConfig.commands || []).map(cmd => typeof cmd === 'string' ? cmd : cmd.name);
};

client.once('ready', () => {
    console.log(`✅ ${botName} is logged in as ${client.user.tag}`);
});

client.on('error', (err) => {
    console.error(`🚨 ${botName} - Discord Bot Connection Error:`, err);
});

client.on('shardError', (err) => {
    console.error(`⚠️ ${botName} - Shard Error:`, err);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!active') {
        const guild = message.guild;
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;

        await message.channel.send(`✅ **${botName} is online!**
👥 **Total Members:** ${totalMembers}
🟢 **Online Now:** ${onlineMembers}
🏡 **Server Name:** ${guild.name}`);
    }
    const enabledCommandNames = normalizeCommandNames();

    if (enabledCommandNames.includes("FAQ")) {
        if (message.content === '!faqs' && message.member.permissions.has('ADMINISTRATOR')) {
            const faqsPath = path.join(__dirname, 'faqs.json');
            if (!fs.existsSync(faqsPath)) {
                fs.writeFileSync(faqsPath, JSON.stringify([]));
                console.log(`📁 Created empty faqs.json file for ${botName}`);
            }
            await postFAQs(message.channel.id);
            await message.channel.send("📚 FAQs posted!").then(sent => {
                setTimeout(() => sent.delete().catch(() => { }), 5000);
            });
        }
    }

    if (enabledCommandNames.includes("Send Commands")) {
        if (message.content.startsWith('!send ') && message.member.permissions.has('ADMINISTRATOR')) {
            const commandToSend = message.content.slice(6);
            await message.channel.send(`🛰️ Command from portal: ${commandToSend}`);
        }
    }
});

// Function to send FAQs
async function postFAQs(channelId) {
    const faqsPath = path.join(__dirname, 'faqs.json');

    if (!fs.existsSync(faqsPath)) {
        console.error(`❌ FAQs file not found: ${faqsPath}`);
        return;
    }

    let faqs;
    try {
        faqs = JSON.parse(fs.readFileSync(faqsPath, 'utf-8'));
    } catch (error) {
        console.error("❌ Error parsing FAQs JSON:", error);
        return;
    }

    const faqChannel = await client.channels.fetch(channelId).catch(err => {
        console.error(`❌ Failed to fetch FAQ channel with ID ${channelId}:`, err);
        return null;
    });

    if (!faqChannel) return;

    for (const [q, a] of faqs) {
        await faqChannel.send(`>>> 💭 **${q}**\n\n💡 ${a}`);
    }

    console.log(`✅ FAQs posted successfully to channel: ${channelId}`);
}

module.exports = {
    start: () => {
        console.log(`🔐 Logging in ${botName}...`);
        client.login(botConfig.token).catch(err => {
            console.error(`❌ Failed to login ${botName}:`, err);
        });
    },
    client
};

// Example future expansion: handle interactions for slash commands or modals
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const enabledCommandNames = normalizeCommandNames();
    if (enabledCommandNames.includes("FAQ") && interaction.commandName === 'faq') {
        await interaction.reply({ content: '💡 FAQ Command Triggered via Slash!', ephemeral: true });
    }

    if (enabledCommandNames.includes("Send Commands") && interaction.commandName === 'send') {
        const content = interaction.options.getString('message');
        await interaction.channel.send(`🛰️ Portal message: ${content}`);
        await interaction.reply({ content: '✅ Command sent!', ephemeral: true });
    }
});

// Utility to fetch text channels for UI forms (used by dashboard)
client.getTextChannels = async function () {
    try {
        const guild = client.guilds.cache.get(serverId);
        if (!guild) return [];

        await guild.channels.fetch();
        return guild.channels.cache
            .filter(ch => ch.type === 0) // GUILD_TEXT
            .map(ch => ({ id: ch.id, name: ch.name }));
    } catch (err) {
        console.error("❌ Failed to fetch text channels:", err);
        return [];
    }
};