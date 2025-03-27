module.exports = {
    getChannels: async (client, guildId) => {
      try {
        const guild = await client.guilds.fetch(guildId);
        if (!guild) throw new Error("Guild not found");
  
        const channels = await guild.channels.fetch();
        const textChannels = channels.filter(
          (ch) => ch && ch.type === 0 // 0 = GUILD_TEXT in discord.js v14
        );
  
        return textChannels.map((ch) => ({
          id: ch.id,
          name: ch.name,
        }));
      } catch (error) {
        console.error("❌ Failed to fetch channels:", error.message);
        return [];
      }
    },
  };
  