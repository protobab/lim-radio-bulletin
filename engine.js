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
    console.log("🚀 Starting 180s Bulletin Generation...");

    try {
        // 1. Fetch MORE News (Increased from 3 to 6 headlines per feed)
        let headlines = "";
        for (const url of RSS_FEEDS) {
            try {
                const res = await fetch(url);
                const text = await res.text();
                const matches = text.match(/<title>(.*?)<\/title>/g)?.slice(1, 7); 
                if (matches) headlines += matches.map(m => m.replace(/<\/?title>/g, '')).join(". ") + ". ";
            } catch (e) { console.log(`⚠️ Skipping ${url}`); }
        }

        // 2. Generate LONG Script (Updated instructions for 180s duration)
        const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ 
                    role: "system", 
                    content: `You are a professional radio anchor for a Nigerian Diaspora station. 
                    Your goal is to write a 3-minute (180 second) news bulletin. 
                    - The script MUST be at least 500 words long.
                    - Use a formal, engaging broadcast tone.
                    - Group stories into: National News, Diaspora Interests, and Sports/Weather.
                    - Add "Broadcast Bridges" like 'In other developments,' or 'Turning now to the economy...'
                    - Provide context to the headlines so the listener understands the 'why' behind the news.`
                },
                { role: "user", content: "Write a detailed 500-word bulletin based on these headlines: " + headlines }]
            })
        });
        const gptData = await gptRes.json();
        const script = gptData.choices[0].message.content;
        console.log(`📝 Long script generated (${script.split(' ').length} words).`);

        // 3. Generate Audio
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({ model: "tts-1", voice: "onyx", input: script })
        });
        const audioBuffer = await ttsRes.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const fileName = `long-bulletin-${Date.now()}.mp3`;

        // 4. Upload to AzuraCast
        const uploadRes = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
            method: "POST",
            headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ path: fileName, file: base64Audio })
        });

        const uploadData = await uploadRes.json();
        const fileId = uploadData.id || uploadData.unique_id;

        // 5. Assign to Playlist
        await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/file/${fileId}`, {
            method: "PUT",
            headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ playlists: [parseInt(PLAYLIST_ID)] })
        });

        console.log("🎯 Success! 3-minute bulletin is live.");

    } catch (err) {
        console.error("❌ Automation Failed:", err.message);
        process.exit(1);
    }
}

run();
