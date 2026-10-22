const express = require('express');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const handleMessage = require('./bot');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const activeSockets = {};

async function startBot(number) {
    if (activeSockets[number]) return activeSockets[number];
    
    const { state, saveCreds } = await useMultiFileAuthState(`./session/${number}`);
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["AlyzDevBot", "Chrome", "1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
            for (let msg of m.messages) {
                if (!msg.message) continue;
                await handleMessage(sock, msg, number);
            }
        }
    });
    
    activeSockets[number] = sock;
    return sock;
}

// Reconnect existing sessions
if (fs.existsSync('./session')) {
    const sessions = fs.readdirSync('./session');
    sessions.forEach(sessionDir => {
        if(sessionDir.startsWith('62')) {
            startBot(sessionDir).catch(console.error);
        }
    });
}

app.post('/api/pair', async (req, res) => {
    let { number } = req.body;
    if (!number) return res.status(400).json({ error: "Number required" });
    
    number = number.replace(/[^0-9]/g, '');
    if (number.startsWith('0')) number = '62' + number.slice(1);
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(`./session/${number}`);
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: ["AlyzDevBot", "Chrome", "1.0.0"]
        });
        sock.ev.on('creds.update', saveCreds);
        
        await new Promise(r => setTimeout(r, 3000));
        
        let code = await sock.requestPairingCode(number);
        if (code && code.length === 8 && !code.includes('-')) {
            code = code.match(/.{1,4}/g).join('-');
        }
        
        activeSockets[number] = sock;
        res.json({ code });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AlyzDevBot Server running on port ${PORT}`));
