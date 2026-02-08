require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const multer = require('multer');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIG ---
const USERS_DB_FILE = './users_db.json';
if (!fs.existsSync(USERS_DB_FILE)) fs.writeFileSync(USERS_DB_FILE, JSON.stringify({}));

function getUser(id) {
    const data = JSON.parse(fs.readFileSync(USERS_DB_FILE));
    return data[id];
}

function saveUser(user) {
    const data = JSON.parse(fs.readFileSync(USERS_DB_FILE));
    data[user.id] = user;
    fs.writeFileSync(USERS_DB_FILE, JSON.stringify(data, null, 2));
}

// --- DISCORD BOT ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`Bot Active: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

async function sendLog(userId, title, desc, color = 0x00f2ff) {
    try {
        const channel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: `User ID: ${userId}` });
        if(channel) channel.send({ embeds: [embed] });
    } catch(e) { console.error('Bot Log Error:', e); }
}

// --- EXPRESS SERVER ---
app.use(express.static('public'));
app.use(express.json());
app.use(session({ secret: 'super-secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    const user = getUser(id);
    done(null, user);
});

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'email']
}, (accessToken, refreshToken, profile, done) => {
    let user = getUser(profile.id);
    if (!user) {
        user = {
            id: profile.id,
            username: profile.username,
            avatar: profile.avatar,
            points: 0,
            joinedAt: new Date()
        };
        saveUser(user);
    }
    return done(null, user);
}));

// Routes
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => res.redirect('/'));

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) res.json(req.user);
    else res.status(401).send();
});

// Topup: TrueMoney Angpao
app.post('/api/topup/truemoney', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Login required' });
    const { link } = req.body;

    // Simulation Only (Put real API Logic here)
    if (link.includes('truemoney.com')) {
        const amount = 50; // Simulated Amount
        req.user.points += amount;
        saveUser(req.user);
        
        sendLog(req.user.id, '💰 เติมเงินสำเร็จ (ซองของขวัญ)', `User: ${req.user.username}\nAmount: ${amount} THB\nLink: ${link}`, 0x2ecc71);
        
        return res.json({ success: true, amount });
    }
    
    res.json({ success: false, message: 'ลิงก์ไม่ถูกต้อง' });
});

// Topup: Slip
const upload = multer({ dest: 'uploads/' });
app.post('/api/topup/slip', upload.single('slip'), (req, res) => {
    if (!req.user) return res.status(401).json({ success: false });
    
    // Simulation (Put Real OCR/Bank API here)
    const amount = parseFloat(req.body.amount);
    req.user.points += amount;
    saveUser(req.user);
    
    sendLog(req.user.id, '📄 เติมเงินสำเร็จ (สลิป)', `User: ${req.user.username}\nAmount: ${amount} THB`, 0x2ecc71);
    
    fs.unlinkSync(req.file.path); // Delete temp file
    res.json({ success: true, amount });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));