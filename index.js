require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const faqsPath = path.join(__dirname, 'faqs.json');
let storedFaqs = [];

if (fs.existsSync(faqsPath)) {
    storedFaqs = JSON.parse(fs.readFileSync(faqsPath, 'utf-8'));
} else {
    fs.writeFileSync(faqsPath, JSON.stringify([]));
}

let lastBotMessageId = null;

// 📌 Function to send predefined FAQs (used by !faqs)
async function postFAQs(channelId) {
    const faqChannel = await client.channels.fetch(channelId).catch(() => null);
    if (!faqChannel) {
        console.error("❌ Failed to fetch FAQ channel with ID:", channelId);
        return;
    }

    const faqs = [
        ["HOW OLD DO I HAVE TO BE TO USE TIKTOK?", "YOU MUST BE AT LEAST 13 YEARS OLD TO USE TIKTOK."],
        ["HOW DO I CHANGE MY TIKTOK USERNAME?", "TO CHANGE YOUR TIKTOK USERNAME, GO TO YOUR PROFILE, TAP \"EDIT PROFILE,\" AND ENTER A NEW USERNAME."],
        ["HOW DO I CREATE A TIKTOK VIDEO?", "TO CREATE A TIKTOK VIDEO, TAP THE \"+\" ICON AT THE BOTTOM OF THE SCREEN, SELECT A VIDEO LENGTH (10 MINUTES ), AND RECORD OR UPLOAD YOUR VIDEO."],
        ["HOW DO I DUET WITH ANOTHER USER ON TIKTOK?", "TO DUET WITH ANOTHER USER ON TIKTOK, FIND A VIDEO YOU WANT TO DUET WITH, TAP THE \"...\" ICON, AND SELECT \"DUET”"],
        ["HOW DO I BLOCK OR UNBLOCK A USER ON TIKTOK?", "TO BLOCK OR UNBLOCK A USER ON TIKTOK, GO TO THEIR PROFILE, TAP THE \"...\" ICON, AND SELECT \"BLOCK\" OR “UNBLOCK”"],
        ["HOW DO I MAKE MONEY ON TIKTOK?", "TO MAKE MONEY ON TIKTOK, YOU CAN USE THE APP'S ADS PLATFORM, PARTICIPATE IN BRAND PARTNERSHIPS, OR SELL MERCHANDISE OR PRODUCTS THROUGH THE APP. IN ADDITION TO YOU CAN RECEIVE MONETARY GIFTS THROUGH LIVES OR SUBSCRIPTION PERCENTAGES."],
        ["HOW DO I GET INTO CREATOR REWARDS PROGRAM?", "TO GET INTO THE TIK TOK CREATOR REWARDS PROGRAM, YOU MUST HAVE AT LEAST 10,000 FOLLOWERS AND 100,000 VIEWS ON YOUR VIDEOS IN THE PAST 30 DAYS. YOU CAN THEN APPLY TO THE TIKTOK CREATOR REWARDS PROGRAM."],
        ["HOW DO I CONTACT TIKTOK SUPPORT?", "TO CONTACT TIKTOK SUPPORT, GO TO THE TIKTOK HELP CENTER, SELECT YOUR ISSUE, AND FOLLOW THE PROMPTS TO SUBMIT A SUPPORT REQUEST."],
        ["HOW DO I START ON TIK TOK?", "CREATE A PROFILE UTILIZING A PICTURE, USERNAME AND BIO. YOUR BIO SHOULD HAVE KEY WORDS AND A CTA (CALL TO ACTION). YOUR BIO SHOULD REFLECT THE CONTENT POSTED ON YOUR PAGE."],
        ["HOW OFTEN SHOULD I POST ON TIK TOK?", "POSTING 2-3 TIMES A DAY DURING PEAK HOURS AND ALSO CHECKING YOUR ANALYTICS IN YOUR BACK OFFICE TO VERIFY YOUR TARGET AUDIENCE AND DEMOGRAPHICS"],
        ["HOW MANY HASH TAGS SHOULD I USE ON TIKTOK?", "TIKTOK RECOMMENDS USING 3-5 RELEVANT HASH TAGS PER VIDEO."],
        ["WHY SHOULD I USE HASH TAGS ON TIKTOK?", "HASH TAGS HELP YOUR CONTENT REACH A WIDER AUDIENCE, INCREASE DISCOVERABILITY, AND ATTRACT NEW FOLLOWERS."],
        ["HOW DO I CHOOSE THE RIGHT HASH TAGS FOR MY TIKTOK CONTENT?", "CHOOSE HASH TAGS THAT ARE:\nRELEVANT TO YOUR CONTENT\nPOPULAR BUT NOT OVERLY COMPETITIVE\nSPECIFIC TO YOUR NICHE OR TARGET AUDIENCE"],
        ["CAN I USE THE SAME HASH TAGS FOR ALL MY TIKTOK VIDEOS?", "NO, IT'S RECOMMENDED TO USE A MIX OF DIFFERENT HASH TAGS FOR EACH VIDEO TO AVOID LOOKING SPAMMY AND TO INCREASE DISCOVERABILITY."],
        ["HOW OFTEN SHOULD I POST ON TIKTOK TO GET THE MOST OUT OF HASH TAGS?", "POSTING FREQUENCY VARIES DEPENDING ON YOUR AUDIENCE AND CONTENT STRATEGY. HOWEVER, IT'S RECOMMENDED TO POST AT LEAST ONCE A DAY TO KEEP YOUR AUDIENCE ENGAGED AND TO INCREASE YOUR HASH TAG REACH. I PERSONALLY SUGGEST 2-3 IF YOU CAN IF NOT AT LEAST 1X DAILY"],
        ["HOW DO I GET MORE FOLLOWERS ON TIKTOK?", "TO GET MORE FOLLOWERS ON TIKTOK, FOCUS ON CREATING HIGH-QUALITY, ENGAGING CONTENT THAT RESONATES WITH YOUR TARGET AUDIENCE. USE RELEVANT HASHTAGS, PARTICIPATE IN CHALLENGES, AND ENGAGE WITH OTHER USERS TO INCREASE YOUR VISIBILITY. TRY FINDING THOSE IN YOUR NICHE ENGAGING WITH THEIR AUDIENCE"],
        ["WHAT TYPE OF CONTENT SHOULD I POST TO GET MORE FOLLOWERS?", "POST CONTENT THAT IS UNIQUE, CREATIVE, AND AUTHENTIC. USE GOOD LIGHTING, SOUND, AND EDITING TO MAKE YOUR VIDEOS STAND OUT. EXPERIMENT WITH DIFFERENT FORMATS, SUCH AS DANCE, COMEDY, OR BEAUTY TUTORIALS."],
        ["HOW CAN I COLLABORATE WITH OTHER USERS TO GET MORE FOLLOWERS?", "COLLABORATE OVER COMPETITION. COLLABORATE WITH OTHER USERS IN YOUR NICHE OR TARGET AUDIENCE TO REACH NEW FOLLOWERS. PARTICIPATE IN CHALLENGES, DUETS, OR OTHER COLLABORATIVE FEATURES TO BUILD RELATIONSHIPS AND GROW YOUR FOLLOWING."],
        ["HOW CAN I USE TIKTOK'S FEATURES TO GET MORE FOLLOWERS?", "USE TIKTOK'S FEATURES, SUCH AS DUETS, REACTIONS, AND EFFECTS, TO MAKE YOUR CONTENT MORE ENGAGING AND INTERACTIVE. EXPERIMENT WITH DIFFERENT FEATURES TO SEE WHAT WORKS BEST FOR YOUR CONTENT AND ENGAGE"],
        ["HOW CAN I PROMOTE MY TIKTOK ACCOUNT TO GET MORE FOLLOWERS?", "PROMOTE YOUR TIKTOK ACCOUNT ON OTHER SOCIAL MEDIA PLATFORMS, SUCH AS INSTAGRAM AND TWITTER. SHARE YOUR TIKTOK VIDEOS ON THESE PLATFORMS TO DRIVE TRAFFIC TO YOUR TIKTOK ACCOUNT. IF THEY DONT KNOW YOU ARE ON TIK TOK HOW CAN THEY CONNECT"]
    ];

    for (const [q, a] of faqs) {
        await faqChannel.send(`>>> 💭 **${q}**\n\n💡 ${a}`);
        await faqChannel.send('\u200B');
    }

    console.log("✅ FAQs have been posted to channel:", channelId);
}

// 📌 Function to post only new FAQs from faqs.json
async function checkNewFaqs(channelId) {
    if (!fs.existsSync(faqsPath)) return;

    const newFaqs = JSON.parse(fs.readFileSync(faqsPath, 'utf-8'));
    const toSend = newFaqs.filter(([q, a]) =>
        !storedFaqs.some(([sq, sa]) => sq === q && sa === a)
    );

    if (toSend.length === 0) {
        console.log("📭 No new FAQs to post.");
        return;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
        console.error("❌ Invalid channel ID for !checknewfaq");
        return;
    }

    for (const [q, a] of toSend) {
        await channel.send(`>>> 💭 **${q}**\n\n💡 ${a}`);
        await channel.send('\u200B');
    }

    storedFaqs.push(...toSend);
    fs.writeFileSync(faqsPath, JSON.stringify(storedFaqs, null, 2));
    console.log(`✅ Posted ${toSend.length} new FAQs to channel: ${channelId}`);
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    const isWelcomeChannel = message.channel.id === '1337211455832985631';

    // ✅ Handle welcome panel update if it's the welcome channel
    if (isWelcomeChannel) {
        try {
            const channel = await client.channels.fetch('1337211455832985631');
            if (lastBotMessageId) {
                try {
                    const lastMessage = await channel.messages.fetch(lastBotMessageId);
                    if (lastMessage) await lastMessage.delete();
                } catch (error) {
                    console.error('Error deleting old message:', error.message);
                }
            }

            const sentMessage = await channel.send({
                content: `>>> 🚨 **ATTENTION NEW MEMBERS!** 🚨\n\n📢 **Don't forget to verify!**\n🔗 Click here: <#1341826631739641988>\n\n✅ This is required to access the full server!`,
            });

            lastBotMessageId = sentMessage.id;
            console.log("✅ Verification message updated.");
        } catch (error) {
            console.error('Error sending verification message:', error);
        }

        return;
    }

    // ✅ ACTIVE CHECK
    if (message.content === '!active') {
        const guild = message.guild;
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;

        await message.channel.send(`✅ **BG BOT is online!**
            👥 **Total Members:** ${totalMembers}
            🟢 **Online Now:** ${onlineMembers}
            🏡 **Server Name:** ${message.guild.name}`);
    }

    // ✅ Manual command to post hardcoded FAQs
    if (message.content === '!faqs' && message.member.permissions.has('ADMINISTRATOR')) {
        await postFAQs(message.channel.id);
        await message.channel.send("📚 FAQs posted!").then(sent => {
            setTimeout(() => sent.delete().catch(() => { }), 5000);
        });
    }

    // ✅ Post new only from faqs.json
    if (message.content === '!checknewfaq' && message.member.permissions.has('ADMINISTRATOR')) {
        await checkNewFaqs(message.channel.id);
        await message.channel.send("📌 Checking for new FAQs...").then(sent => {
            setTimeout(() => sent.delete().catch(() => { }), 5000);
        });
    }
});

async function handlePortalCommand(command, channelId) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const fakeMessage = {
        content: command,
        channel,
        guild: client.guilds.cache.first(),
        member: {
            permissions: {
                has: () => true
            }
        },
        author: { bot: false }
    };

    client.emit('messageCreate', fakeMessage);
}

client.login(process.env.TOKEN);

module.exports = {
    client,
    postFAQs,
    checkNewFaqs,
    handlePortalCommand
  };