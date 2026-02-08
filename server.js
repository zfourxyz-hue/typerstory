require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Mock Database (Replace with MongoDB/MySQL in production)
const users = {}; 

// Setup Passport
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    if (!users[id]) users[id] = { id, username: 'User', credits: 0 };
    done(null, users[id]);
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    if (!users[profile.id]) {
        users[profile.id] = {
            id: profile.id,
            username: profile.username,
            avatar: profile.avatar,
            credits: 0,
            discriminator: profile.discriminator
        };
    }
    return done(null, users[profile.id]);
}));

app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'typerstory_secret_key',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => res.redirect('/'));

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not logged in' });
    res.json(req.user);
});

// TrueMoney Gift Link Redemption (Mock Logic)
app.post('/api/topup/truemoney', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { link, phone } = req.body;

    // NOTE: Real implementation requires a library like 'truewallet-voucher'
    // or external API service. This is a simulation.
    console.log(`Processing link: ${link} for user ${req.user.username}`);
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));

    // Simple validation logic
    if (link.includes('gift.truemoney.com')) {
        const amount = Math.floor(Math.random() * 100) + 20; // Simulated amount
        users[req.user.id].credits += amount;
        
        // Notify via Webhook or Bot
        sendBotLog(req.user.id, `Topup TrueMoney: ${amount} THB`);
        
        res.json({ success: true, amount });
    } else {
        res.json({ success: false, message: 'ลิงก์ซองของขวัญไม่ถูกต้อง' });
    }
});

// Slip Verification (Mock Logic using OpenSlip/EasySlip pattern)
const upload = multer({ dest: 'uploads/' });
app.post('/api/topup/slip', upload.single('slip'), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!req.file) return res.json({ success: false, message: 'No file uploaded' });

    const amount = parseFloat(req.body.amount);
    
    // NOTE: In production, send fs.createReadStream(req.file.path) to Slip Verification API
    // e.g., axios.post('https://api.openslip.com/verify', formData, headers...)
    
    console.log(`Verifying slip for ${req.user.username}, amount: ${amount}`);
    
    // Simulate Verification Success
    await new Promise(r => setTimeout(r, 2000));
    
    // Cleanup file
    fs.unlinkSync(req.file.path);

    users[req.user.id].credits += amount;
    sendBotLog(req.user.id, `Topup Slip: ${amount} THB`);

    res.json({ success: true, amount });
});

// Helper to communicate with Bot
function sendBotLog(userId, message) {
    // Ideally use an Event Emitter or direct import if in same process
    // For this script, we assume bot.js runs separately or we integrate here.
    // See bot.js integration below.
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));