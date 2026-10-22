const fs = require('fs');
const axios = require('axios');
const { ownerNumber, MENU_IMAGE_URL, PHOTO_LIST, CHANNEL_LINK } = require('./config');

let selfMode = false;

module.exports = async (sock, msg, botNumber) => {
    try {
        const remoteJid = msg.key.remoteJid;
        if (msg.key.fromMe && !msg.message) return;

        const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || "";
        const sender = msg.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : msg.key.participant || msg.key.remoteJid;
        const senderNumber = sender.split('@')[0];
        const isOwner = ownerNumber.includes(senderNumber) || msg.key.fromMe;

        if (!content.startsWith('.')) return;
        const args = content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (selfMode && !isOwner) return;

        const reply = async (text) => {
            await sock.sendMessage(remoteJid, { text: text }, { quoted: msg });
        };

        switch (command) {
            case 'menu':
                // Step 1: Send Image
                await sock.sendMessage(remoteJid, { image: { url: MENU_IMAGE_URL } });
                // Step 2: Delay 0.5s WAJIB
                await new Promise(r => setTimeout(r, 500));
                // Step 3: Check mp3 and send audio ptt
                if (fs.existsSync('./media/alyz.mp3')) {
                    await sock.sendMessage(remoteJid, { 
                        audio: fs.readFileSync('./media/alyz.mp3'), 
                        mimetype: 'audio/mpeg', 
                        ptt: true 
                    });
                }
                // Step 4: Send Menu Text
                const menuText = `*ALYBOT MENU*\n\n.rvo\n.tiktok\n.selfmode\n.ai\n.toptv\n.linksl\n.addowner\n.deluser\n.adduser\n.ftrdm\n.info`;
                await sock.sendMessage(remoteJid, { text: menuText });
                break;
            
            case 'rvo':
                reply("RVO executed.");
                break;

            case 'tiktok':
                if (!args[0]) return reply("Kirim link tiktok");
                try {
                    const res = await axios.get(`https://tikwm.com/api/?url=${args[0]}`);
                    if (res.data && res.data.data) {
                        await sock.sendMessage(remoteJid, { video: { url: res.data.data.play }, caption: "Tiktok Downloaded" }, { quoted: msg });
                    } else {
                        reply("Gagal unduh.");
                    }
                } catch (e) {
                    reply("Error API tikwm.com.");
                }
                break;

            case 'selfmode':
                if (!isOwner) return reply("Owner only.");
                const state = args[0]?.toLowerCase();
                if (state === 'on') {
                    selfMode = true;
                    reply("Selfmode ON");
                } else if (state === 'off') {
                    selfMode = false;
                    reply("Selfmode OFF");
                } else {
                    reply("Format: .selfmode on/off");
                }
                break;

            case 'ai':
                let mathExp = args.join(' ').replace(/[×x]/ig, '*').replace(/[:÷]/g, '/');
                try {
                    const result = new Function(`return ${mathExp}`)();
                    reply(`Result Hasil: ${result}`);
                } catch (e) {
                    reply("Format math salah.");
                }
                break;

            case 'toptv':
                if (!args[0]) return reply("Kirim link video");
                await sock.sendMessage(remoteJid, { video: { url: args[0] }, ptv: true }, { quoted: msg });
                break;

            case 'linksl':
                reply(`HALO USER NEW ALYZBOT, JANGAN LUPA FOLLOW SALURAN KU YAH BUAT TAU INPO LAIN TENTANG BOT KU ${CHANNEL_LINK}`);
                break;

            case 'addowner':
                reply("MAU ADD OWNER? DM ALYZ DI TELE @ZayyAlyzz");
                break;

            case 'deluser':
                if (!isOwner) return reply("Owner only.");
                const targetDel = args[0];
                if (targetDel && targetDel.startsWith("62")) {
                    const pathDir = `./session/${targetDel}`;
                    if (fs.existsSync(pathDir)) {
                        fs.rmSync(pathDir, { recursive: true, force: true });
                        reply(`Session ${targetDel} deleted.`);
                    } else {
                        reply("Session tidak ditemukan.");
                    }
                } else {
                    reply("Format nomor salah, gunakan 62xxx");
                }
                break;
            
            case 'adduser':
                if (!isOwner) return reply("Owner only.");
                const targetAdd = args[0];
                if (targetAdd && targetAdd.startsWith("62")) {
                    try {
                        const { useMultiFileAuthState, makeWASocket } = require('@whiskeysockets/baileys');
                        const pino = require('pino');
                        const { state, saveCreds } = await useMultiFileAuthState(`./session/${targetAdd}`);
                        const newSock = makeWASocket({
                            auth: state,
                            printQRInTerminal: false,
                            logger: pino({ level: "silent" }),
                            browser: ["AlyzDevBot", "Chrome", "1.0.0"]
                        });
                        newSock.ev.on('creds.update', saveCreds);
                        await new Promise(r => setTimeout(r, 3000));
                        let code = await newSock.requestPairingCode(targetAdd);
                        // Format to XXXX-XXXX if not already
                        if (code && code.length === 8 && !code.includes('-')) {
                            code = code.match(/.{1,4}/g).join('-');
                        }
                        reply(`REAL pairing code untuk ${targetAdd}: ${code}`);
                    } catch (e) {
                        reply("Gagal membuat pairing code.");
                    }
                } else {
                    reply("Format nomor salah, gunakan 62xxx");
                }
                break;

            case 'ftrdm':
                const randomImg = PHOTO_LIST[Math.floor(Math.random() * PHOTO_LIST.length)];
                await sock.sendMessage(remoteJid, { image: { url: randomImg }, caption: "Random Photo" }, { quoted: msg });
                break;

            case 'info':
                reply("Halo Saya Alyz Bot, Saya adalah Bot WhatsApp yang di buat oleh Tuan saya Alyz, Akun sosial media Tiktok : @aizxstechu, Hubungi Masalah Tentang bot di tele @ZayyAlyzz");
                break;
        }
    } catch (e) {
        console.error(e);
    }
};
