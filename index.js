require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let lastBotMessageId = null; // Store the last message ID

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Ensure message is only processed if sent in the welcome channel
    if (message.channel.id !== '1337211455832985631') return;

    // Allow testing the verification message with any user message (admin only)
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        return;
    }

    try {
        const channel = await client.channels.fetch('1337211455832985631'); // Correct welcome channel

        // Delete previous message if it exists
        if (lastBotMessageId) {
            try {
                const lastMessage = await channel.messages.fetch(lastBotMessageId);
                if (lastMessage) await lastMessage.delete();
            } catch (error) {
                console.error('Error deleting old message:', error.message);
            }
        }

        // Send the new verification reminder with panel-style formatting
        const sentMessage = await channel.send({
            content: `>>> 🚨 **ATTENTION NEW MEMBERS!** 🚨\n\n📢 **Don't forget to verify!**\n🔗 Click here: <#1341826631739641988>\n\n✅ This is required to access the full server!`,
        });

        // Store the new message ID
        lastBotMessageId = sentMessage.id;

        // Confirm execution
        message.reply("✅ Verification message updated.");
    } catch (error) {
        console.error('Error sending verification message:', error);
        message.reply("❌ Failed to send verification message.");
    }
}); 

client.login(process.env.TOKEN);