const fs = require('fs');
const path = require('path');

module.exports = async function handleFAQCommand(client, guildId, channelId, faqData) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            console.error(`❌ Invalid channel for FAQ posting: ${channelId}`);
            return { success: false, message: "Invalid channel." };
        }

        // Path to the server-specific faqs.json file
        const guildFaqPath = path.join(__dirname, '..', '..', 'data', guildId, 'faqs.json');

        // Ensure directory exists
        fs.mkdirSync(path.dirname(guildFaqPath), { recursive: true });

        // Load existing FAQs or initialize empty array
        let existingFaqs = [];
        if (fs.existsSync(guildFaqPath)) {
            existingFaqs = JSON.parse(fs.readFileSync(guildFaqPath, 'utf-8'));
        }

        // Add new FAQ entry
        existingFaqs.push(faqData);
        fs.writeFileSync(guildFaqPath, JSON.stringify(existingFaqs, null, 2));

        // Post to channel
        await channel.send(`>>> 💭 **${faqData.question}**\n\n💡 ${faqData.answer}`);
        console.log(`✅ Posted FAQ to channel ${channelId} in guild ${guildId}`);

        return { success: true };
    } catch (error) {
        console.error("❌ Error handling FAQ command:", error);
        return { success: false, message: error.message };
    }
};
