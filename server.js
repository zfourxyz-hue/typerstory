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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('ready', () => console.log(`Bot Active: ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN);

async function sendLog(userId, title, desc, color = 0x00f2ff) {
    try {
        const channel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
        if(channel) {
            const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color).setTimestamp().setFooter({ text: `ID: ${userId}` });
            channel.send({ embeds: [embed] });
        }
    } catch(e) { console.error("Log Error:", e); }
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(session({ secret: 'typerstory_secure_key', resave: false, saveUninitialized: false }));
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
        user = { id: profile.id, username: profile.username, avatar: profile.avatar, points: 0 };
        saveUser(user);
    }
    return done(null, user);
}));

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/'));

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) res.json(req.user);
    else res.status(401).send();
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

app.post('/api/topup/truemoney', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false });
    const { link, phone } = req.body;
    
    // Simulate Check
    if (link.includes('gift.truemoney.com')) {
        const amount = Math.floor(Math.random() * 90) + 10;
        req.user.points += amount;
        saveUser(req.user);
        sendLog(req.user.id, 'Topup Success (Angpao)', `User: ${req.user.username}\nAmount: ${amount} THB\nLink: ${link}`, 0x2ecc71);
        return res.json({ success: true, amount });
    }
    res.json({ success: false, message: 'Invalid Gift Link' });
});

const upload = multer({ dest: 'uploads/' });
app.post('/api/topup/slip', upload.single('slip'), (req, res) => {
    if (!req.user) return res.status(401).json({ success: false });
    const amount = parseFloat(req.body.amount);
    
    // Simulate Slip Verification
    req.user.points += amount;
    saveUser(req.user);
    sendLog(req.user.id, 'Topup Slip Uploaded', `User: ${req.user.username}\nClaimed Amount: ${amount}`, 0x3498db);
    
    if(req.file) fs.unlinkSync(req.file.path);
    res.json({ success: true, amount });
});

app.listen(PORT, () => console.log(`Server is running! Access via domain: https://typerstory.xyz (or http://localhost:${PORT} for testing)`));