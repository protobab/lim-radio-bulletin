const AZ_URL = process.env.AZ_URL?.replace(/\/$/, '');
const AZ_KEY = process.env.AZ_KEY;
const AZ_STATION_ID = process.env.AZ_STATION_ID;
const OPENAI_KEY = process.env.OPENAI_KEY;
const PLAYLIST_ID = process.env.AZ_PLAYLIST_ID;

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
                const matches = text.match(/<title>(.*?)<\/title>/g)?.slice(1, 4);
                if (matches) headlines += matches.map(m => m.replace(/<\/?title>/g, '')).join(". ") + ". ";
            } catch (e) { console.log(`⚠️ Skipping ${url}`); }
        }

        // 2. Generate Script
        const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: "You are a professional radio anchor. Write a concise 2-minute news bulletin for the Nigerian diaspora." },
                           { role: "user", content: headlines }]
            })
        });
        const gptData = await gptRes.json();
        const script = gptData.choices[0].message.content;
        console.log("📝 Script generated.");

        // 3. Generate Audio
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({ model: "tts-1", voice: "onyx", input: script })
        });
        const audioBuffer = await ttsRes.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const fileName = `bulletin-${Date.now()}.mp3`;
        console.log("🎙️ Audio synthesized.");

        // 4. Upload to AzuraCast (JSON Method)
        console.log(`📤 Uploading to AzuraCast station ${AZ_STATION_ID}...`);
        const uploadRes = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
            method: "POST",
            headers: { 
                "X-API-Key": AZ_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                path: fileName, // Uploads to the root music folder for maximum compatibility
                file: base64Audio
            })
        });

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            throw new Error(`Upload Failed: ${uploadRes.status} - ${errText}`);
        }

        const uploadData = await uploadRes.json();
        const fileId = uploadData.id || uploadData.unique_id;
        console.log(`✅ Upload successful. File ID: ${fileId}`);

        // 5. Assign to Playlist
        console.log(`📻 Adding to playlist ${PLAYLIST_ID}...`);
        const playlistRes = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/file/${fileId}`, {
            method: "PUT",
            headers: { 
                "X-API-Key": AZ_KEY, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ playlists: [parseInt(PLAYLIST_ID)] })
        });

        if (!playlistRes.ok) console.log("⚠️ Note: File uploaded but playlist assignment failed.");
        else console.log("🎯 Success! Bulletin is live.");

    } catch (err) {
        console.error("❌ Automation Failed:", err.message);
        process.exit(1);
    }
}

run();
