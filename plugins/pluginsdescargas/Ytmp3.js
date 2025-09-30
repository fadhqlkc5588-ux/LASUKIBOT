// comandos/ytmp3.js — usa Sky API (audio) + banner estilo Suki
const axios = require("axios");
const { PassThrough } = require("stream");
const ffmpeg = require("fluent-ffmpeg");

const API_BASE = process.env.API_BASE || "https://api-sky.ultraplus.click";
const API_KEY  = process.env.API_KEY  || "Russellxz";   // tu API key
const MAX_MB   = 99;

const isYouTube = (u) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)\//i.test(u || "");

const fmtSec = (s) => {
  const n = Number(s || 0);
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const sec = n % 60;
  return (h ? `${h}:` : "") + `${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
};

const handler = async (msg, { conn, text, args, usedPrefix, command }) => {
  const chatId = msg.key.remoteJid;
  const pref = (global.prefixes && global.prefixes[0]) || usedPrefix || ".";

  if (!text || !isYouTube(text)) {
    return conn.sendMessage(chatId, {
      text:
`✳️ 𝙐𝙨𝙤 𝙘𝙤𝙧𝙧𝙚𝙘𝙩𝙤:
${pref}${command} <enlace de YouTube>

📌 𝙀𝙟𝙚𝙢𝙥𝙡𝙤:
${pref}${command} https://youtu.be/dQw4w9WgXcQ`
    }, { quoted: msg });
  }

  await conn.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });

  try {
    // Llamada a tu Sky API (formato audio)
    const { data: api, status: http } = await axios.get(
      `${API_BASE}/api/download/yt.php`,
      {
        params: { url: text, format: "audio" },
        headers: { Authorization: `Bearer ${API_KEY}` },
        timeout: 30000,
        validateStatus: s => s >= 200 && s < 600
      }
    );

    if (http !== 200 || !api || api.status !== "true" || !api.data?.audio) {
      const msgErr = api?.error || `HTTP ${http}`;
      throw new Error(`No se pudo obtener audio (${msgErr}).`);
    }

    const d = api.data;
    const title = d.title || "YouTube";
    const durationTxt = d.duration ? fmtSec(d.duration) : "—";
    const thumb = d.thumbnail || "";

    // Banner con info + “source: api-sky.ultraplus.click”
    await conn.sendMessage(chatId, {
      image: thumb ? { url: thumb } : undefined,
      caption:
`⚡ 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 — 𝗔𝘂𝗱𝗶𝗼 𝗲𝗻 𝗣𝗿𝗼𝗰𝗲𝘀𝗼

✦ 𝗧𝗶́𝘁𝘂𝗹𝗼: ${title}
✦ 𝗗𝘂𝗿𝗮𝗰𝗶𝗼́𝗻: ${durationTxt}
✦ 𝗦𝗼𝘂𝗿𝗰𝗲: api-sky.ultraplus.click

✨ Preparando MP3 (128kbps)…`,
      mimetype: "image/jpeg"
    }, { quoted: msg });

    // Descarga del audio fuente (puede ser m4a/webm) y transcode → MP3
    const src = String(d.audio);
    const response = await axios.get(src, { responseType: "stream", timeout: 120000 });

    const buffers = [];
    const passthrough = new PassThrough();

    const done = new Promise((resolve, reject) => {
      ffmpeg(response.data)
        .audioCodec("libmp3lame")
        .audioBitrate("128k")
        .format("mp3")
        .on("error", reject)
        .on("end", resolve)
        .pipe(passthrough);
    });

    passthrough.on("data", (chunk) => buffers.push(chunk));
    await done;

    const finalBuffer = Buffer.concat(buffers);
    const sizeMB = finalBuffer.length / (1024 * 1024);

    if (sizeMB > MAX_MB) {
      return conn.sendMessage(chatId, {
        text:
`🚫 𝗔𝗿𝗰𝗵𝗶𝘃𝗼 𝗱𝗲𝗺𝗮𝘀𝗶𝗮𝗱𝗼 𝗽𝗲𝘀𝗮𝗱𝗼
📦 Tamaño: ${sizeMB.toFixed(2)} MB
🔒 Límite: ${MAX_MB} MB`
      }, { quoted: msg });
    }

    // Envío del MP3 final
    await conn.sendMessage(chatId, {
      audio: finalBuffer,
      mimetype: "audio/mpeg",
      fileName: `${title}.mp3`,
      caption:
`🎵 𝗬𝗧 𝗠𝗣𝟯 — 𝗟𝗶𝘀𝘁𝗼

✦ 𝗧𝗶́𝘁𝘂𝗹𝗼: ${title}
✦ 𝗗𝘂𝗿𝗮𝗰𝗶𝗼́𝗻: ${durationTxt}
✦ 𝗦𝗼𝘂𝗿𝗰𝗲: api-sky.ultraplus.click

🤖 𝙎𝙪𝙠𝙞 𝘽𝙤𝙩`
    }, { quoted: msg });

    await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

  } catch (err) {
    console.error("❌ Error en ytmp3 (Sky):", err?.message || err);
    await conn.sendMessage(chatId, {
      text: `❌ *Error:* ${err?.message || "Fallo al procesar el audio."}`
    }, { quoted: msg });
    await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
  }
};

handler.command  = ["ytmp3","yta"];
handler.help     = ["ytmp3 <url>", "yta <url>"];
handler.tags     = ["descargas"];
handler.register = true;

module.exports = handler;
