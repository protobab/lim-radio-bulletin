const fs = require('fs');

// Settings - Change these as needed
const AZ_URL = process.env.AZ_URL;
const AZ_KEY = process.env.AZ_KEY;
const AZ_STATION_ID = process.env.AZ_STATION_ID;
const OPENAI_KEY = process.env.OPENAI_KEY;
const PLAYLIST_ID = process.env.AZ_PLAYLIST_ID; // The ID of the playlist to update
const RSS_FEEDS = [
    "https://vanguardngr.com/feed",
    "https://www.premiumtimesng.com/feed",
    "https://guardian.ng/feed/",
    "https://punchng.com/feed/",
    "https://feeds.bbci.co.uk/news/world/africa/rss.xml"
];

async function run() {
    console.log("🚀 Starting Automated Bulletin Generation...");

    try {
        // 1. Fetch News
        let headlines = "";
        for (const url of RSS_FEEDS) {
            try {
                const res = await fetch(url);
                const text = await res.text();
                const matches = text.match(/<title>(.*?)<\/title>/g).slice(1, 4);
                headlines += matches.map(m => m.replace(/<\/?title>/g, '')).join(". ") + ". ";
            } catch (e) { console.log(`⚠️ Failed to fetch ${url}`); }
        }

        // 2. Generate Script (OpenAI GPT-4o-mini)
        const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: "You are a professional radio anchor for the Nigerian diaspora. Write a 2-minute news bulletin." },
                           { role: "user", content: headlines }]
            })
        });
        const gptData = await gptRes.json();
        const script = gptData.choices[0].message.content;

        // 3. Generate Audio (OpenAI TTS)
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({ model: "tts-1", voice: "onyx", input: script })
        });
        const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
        
        // 4. Upload to AzuraCast
        const fileName = `bulletin-${Date.now()}.mp3`;
        const uploadRes = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
            method: "POST",
            headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
                path: `bulletins/${fileName}`,
                file: audioBuffer.toString('base64')
            })
        });
        const uploadData = await uploadRes.json();
        const fileId = uploadData.unique_id || uploadData.id;

        // 5. Assign to Playlist
        await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/file/${fileId}`, {
            method: "PUT",
            headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ playlists: [parseInt(PLAYLIST_ID)] })
        });

        console.log("✅ Success! Bulletin uploaded and scheduled in AzuraCast.");
    } catch (err) {
        console.error("❌ Automation Failed:", err);
        process.exit(1);
    }
}

run();
