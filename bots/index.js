const fs = require('fs');
const path = require('path');

const userBots = require(path.resolve(__dirname, '../config/userBots.json'));
if (!userBots || typeof userBots.bots !== 'object') {
  console.error("❌ Invalid userBots configuration format.");
  process.exit(1);
}

const botFolders = fs.readdirSync(__dirname).filter(folder => {
  const folderPath = path.join(__dirname, folder);
  return fs.statSync(folderPath).isDirectory() && fs.existsSync(path.join(folderPath, 'index.js'));
});

for (const folder of botFolders) {
  try {
    console.log(`📦 Loading bot from folder: ${folder}`);

    const botConfigEntry = Object.entries(userBots.bots).find(([serverId, config]) => {
      const folderName = (config.folder || '').toLowerCase();
      return folderName === folder.toLowerCase();
    });

    if (!botConfigEntry) {
      console.error(`❌ No matching config entry found for folder "${folder}"`);
      continue;
    }

    const [serverId, botConfig] = botConfigEntry;

    console.log(`🔍 Matched config for serverId: ${serverId}, bot name: ${botConfig?.name}`);

    if (!botConfig.token || typeof botConfig.token !== 'string') {
      console.error(`❌ No token found for bot "${botConfig.name}". Check ${path.resolve(__dirname, '../config/userBots.json')}`);
      continue;
    }

    const botPath = path.join(__dirname, folder, 'index.js');
    if (!fs.existsSync(botPath)) {
      console.error(`❌ Bot file not found at "${botPath}"`);
      continue;
    }

    const botModule = require(botPath);
    console.log(`🔐 Logging in ${botConfig.name}...`);

    if (typeof botModule === 'function') {
      botModule(botConfig.token, serverId, botConfig.name);
    } else if (botModule && typeof botModule.start === 'function') {
      botModule.start(botConfig.token, serverId, botConfig.name);
    } else {
      console.error(`❌ The bot module in "${folder}" must export either a function or an object with a start() method`);
      continue;
    }

    console.log(`✅ ${botConfig.name} bot launched successfully.`);
  } catch (err) {
    console.error(`❌ Failed to load bot in folder "${folder}":`, err.message);
  }
}

module.exports = {
  loadBots: () => {
    for (const folder of botFolders) {
      try {
        console.log(`📦 Loading bot from folder: ${folder}`);

        const botConfigEntry = Object.entries(userBots.bots).find(([serverId, config]) => {
          const folderName = (config.folder || '').toLowerCase();
          return folderName === folder.toLowerCase();
        });

        if (!botConfigEntry) {
          console.error(`❌ No matching config entry found for folder "${folder}"`);
          continue;
        }

        const [serverId, botConfig] = botConfigEntry;

        console.log(`🔍 Matched config for serverId: ${serverId}, bot name: ${botConfig?.name}`);

        if (!botConfig.token || typeof botConfig.token !== 'string') {
          console.error(`❌ No token found for bot "${botConfig.name}". Check ${path.resolve(__dirname, '../config/userBots.json')}`);
          continue;
        }

        const botPath = path.join(__dirname, folder, 'index.js');
        if (!fs.existsSync(botPath)) {
          console.error(`❌ Bot file not found at "${botPath}"`);
          continue;
        }

        const botModule = require(botPath);
        console.log(`🤖 [bots/index.js] Logging in ${botConfig.name}...`);

        if (typeof botModule === 'function') {
          botModule(botConfig.token, serverId, botConfig.name);
        } else if (botModule && typeof botModule.start === 'function') {
          botModule.start(botConfig.token, serverId, botConfig.name);
        } else {
          console.error(`❌ The bot module in "${folder}" must export either a function or an object with a start() method`);
          continue;
        }

        console.log(`✅ ${botConfig.name} bot launched successfully.`);
      } catch (err) {
        console.error(`❌ Failed to load bot in folder "${folder}":`, err.message);
      }
    }
  }
};