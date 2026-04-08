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
    console.log("🚀 Starting 120s Auto-Overwrite Bulletin...");

    try {
        // 1. Fetch News
        let headlines = "";
        for (const url of RSS_FEEDS) {
            try {
                const res = await fetch(url);
                const text = await res.text();
                const matches = text.match(/<title>(.*?)<\/title>/g)?.slice(1, 5); 
                if (matches) headlines += matches.map(m => m.replace(/<\/?title>/g, '')).join(". ") + ". ";
            } catch (e) { console.log(`⚠️ Skipping ${url}`); }
        }

        // 2. Generate Script (Targeting 120 seconds / ~350 words)
        const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ 
                    role: "system", 
                    content: `You are a professional radio anchor for the Nigerian diaspora. 
                    Write a 2-minute (120 second) news bulletin. 
                    - Your script MUST be approximately 350 words.
                    - Start with a warm greeting and end with a station sign-off.
                    - Cover the most important Nigerian national news and one diaspora-relevant story.`
                },
                { role: "user", content: "Write a 350-word bulletin based on: " + headlines }]
            })
        });
        const gptData = await gptRes.json();
        const script = gptData.choices[0].message.content;
        console.log(`📝 Script length: ${script.split(' ').length} words (~120s).`);

        // 3. Generate Audio
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({ model: "tts-1", voice: "onyx", input: script })
        });
        const audioBuffer = await ttsRes.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        
        // FIXED FILENAME: This causes AzuraCast to replace the old file
        const fileName = `daily_news_bulletin.mp3`; 

        // 4. Upload to AzuraCast
        console.log(`📤 Uploading and overwriting ${fileName}...`);
        const uploadRes = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
            method: "POST",
            headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ path: fileName, file: base64Audio })
        });

        const uploadData = await uploadRes.json();
        const fileId = uploadData.id || uploadData.unique_id;

        // 5. Finalize Playlist Assignment
        // Note: Even if the file overwrites, we re-run this to ensure it's synced
        await new Promise(resolve => setTimeout(resolve, 2000));
        await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/file/${fileId}`, {
            method: "PUT",
            headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ playlists: [parseInt(PLAYLIST_ID)] })
        });

        console.log("🎯 Success! The news has been updated and replaced.");

    } catch (err) {
        console.error("❌ Automation Failed:", err.message);
        process.exit(1);
    }
}

run();
