// comandos/tiktok.js — tt (usa la lógica de tiktok2.js + estilo Suki)
const axios = require("axios");

const API_BASE = process.env.API_BASE || "https://api-sky.ultraplus.click";
const API_KEY  = process.env.API_KEY  || "Russellxz"; // tu key
const MAX_TIMEOUT = 25000;

const fmtSec = (s) => {
  const n = Number(s || 0);
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const sec = n % 60;
  return (h ? `${h}:` : "") + `${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
};

const handler = async (msg, { conn, args, command }) => {
  const chatId = msg.key.remoteJid;
  const text   = (args || []).join(" ");
  const pref   = (global.prefixes && global.prefixes[0]) || ".";

  if (!text) {
    return conn.sendMessage(chatId, {
      text:
`✳️ 𝙐𝙨𝙖:
${pref}${command} <enlace>
Ej: ${pref}${command} https://vm.tiktok.com/xxxxxx/`
    }, { quoted: msg });
  }

  const url = args[0];
  if (!/^https?:\/\//i.test(url) || !/tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com/i.test(url)) {
    return conn.sendMessage(chatId, { text: "❌ 𝙀𝙣𝙡𝙖𝙘𝙚 𝙙𝙚 𝙏𝙞𝙠𝙏𝙤𝙠 𝙞𝙣𝙫𝙖́𝙡𝙞𝙙𝙤." }, { quoted: msg });
  }

  try {
    await conn.sendMessage(chatId, { react: { text: "⏱️", key: msg.key } });

    // Igual que en tiktok2.js: llamamos al endpoint PHP de tu API
    const { data: res, status: http } = await axios.get(
      `${API_BASE}/api/download/tiktok.php`,
      {
        params: { url },
        headers: { Authorization: `Bearer ${API_KEY}` },
        timeout: MAX_TIMEOUT,
        validateStatus: s => s >= 200 && s < 600
      }
    );

    // Log útil (opcional)
    console.log("[tt] Sky API http:", http, "body:", res);

    if (http !== 200) {
      throw new Error(`HTTP ${http}${res?.error ? ` - ${res.error}` : ""}`);
    }
    if (!res || res.status !== "true" || !res.data?.video) {
      throw new Error(res?.error || "La API no devolvió un video válido.");
    }

    const d = res.data;

    // Caption “Suki” futurista (una sola pieza de video)
    const title   = d.title || "TikTok";
    const author  = (d.author && (d.author.name || d.author.username)) || "—";
    const durTxt  = d.duration ? fmtSec(d.duration) : "—";
    const likes   = d.likes ?? 0;
    const comments= d.comments ?? 0;

    const caption =
`⚡ 𝗧𝗶𝗸𝗧𝗼𝗸 — 𝗩𝗶𝗱𝗲𝗼 𝗹𝗶𝘀𝘁𝗼

✦ 𝗧𝗶́𝘁𝘂𝗹𝗼: ${title}
✦ 𝗔𝘂𝘁𝗼𝗿: ${author}
✦ 𝗗𝘂𝗿𝗮𝗰𝗶𝗼́𝗻: ${durTxt}
✦ 𝗟𝗶𝗸𝗲𝘀: ${likes}  •  𝗖𝗼𝗺𝗲𝗻𝘁𝗮𝗿𝗶𝗼𝘀: ${comments}

✦ 𝗦𝗼𝘂𝗿𝗰𝗲: api-sky.ultraplus.click
────────────
🤖 𝙎𝙪𝙠𝙞 𝘽𝙤𝙩`;

    // Enviar SOLO 1 video (el principal de la API)
    await conn.sendMessage(chatId, {
      video: { url: d.video },
      mimetype: "video/mp4",
      caption
    }, { quoted: msg });

    // Si quisieras enviar el audio aparte (opcional):
    // if (d.audio) {
    //   await conn.sendMessage(chatId, {
    //     audio: { url: d.audio },
    //     mimetype: "audio/mpeg"
    //   }, { quoted: msg });
    // }

    await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });

  } catch (err) {
    console.error("❌ Error en tt:", err?.message || err);
    await conn.sendMessage(chatId, {
      text: `❌ *Error:* ${err?.message || "Fallo al procesar el TikTok."}`
    }, { quoted: msg });
    await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
  }
};

handler.command = ["tiktok","tt"];
handler.help = ["tiktok <url>", "tt <url>"];
handler.tags = ["descargas"];
handler.register = true;

module.exports = handler;
