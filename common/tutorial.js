const { EmbedBuilder } = require('discord.js');

function getTutorialEmbed(botName = 'Bot', commands = ['!ping', '!faqs', '!help']) {
    return new EmbedBuilder()
        .setTitle(`📚 ${botName} Tutorial`)
        .setDescription("Learn how to use this bot effectively.")
        .setColor(0x00AE86)
        .addFields(
            { name: "⚡ Command List", value: commands.join(', ') },
            { name: "🚀 Need Support?", value: "Contact an admin for help." }
        );
}

module.exports = { getTutorialEmbed };