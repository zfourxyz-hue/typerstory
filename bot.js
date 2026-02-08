require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const GUILD_ID = 'YOUR_GUILD_ID';
const LOG_CHANNEL_ID = 'YOUR_CHANNEL_ID';

client.once('ready', () => {
    console.log(`Bot Logged in as ${client.user.tag}`);
});

// Function exposed to Server (if running in same process via module.exports)
// Or listen to Database changes if separated.
// Here is a standalone command example.

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    if (interaction.commandName === 'profile') {
        // Fetch from DB (Mock)
        // const user = db.find(interaction.user.id);
        await interaction.reply({ content: 'ตรวจสอบผ่านหน้าเว็บได้เลยครับ!', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);