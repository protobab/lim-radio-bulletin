/**
 * ABIOLA HASSAN CHIDI - AUTOMATED BULLETIN ENGINE
 * Identity: Pan-Nigerian, Professional, Unifying
 * Features: Live News, FX Rates, Global Weather, Heritage Facts, Proverbs
 */

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
    console.log("🚀 Starting Abiola Hassan Chidi Bulletin Generation...");

    try {
        // 1. FETCH LIVE EXCHANGE RATES (Remittance focus)
        let forexData = "Rates currently unavailable.";
        try {
            const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
            const fxJSON = await fxRes.json();
            const ngn = fxJSON.rates.NGN;
            const gbpNgn = (ngn / fxJSON.rates.GBP).toFixed(2);
            forexData = `The US Dollar stands at ${ngn} Naira, while the British Pound is at ${gbpNgn} Naira.`;
        } catch (e) { console.log("⚠️ Forex fetch failed"); }

        // 2. FETCH NEWS HEADLINES
        let headlines = "";
        for (const url of RSS_FEEDS) {
            try {
                const res = await fetch(url);
                const text = await res.text();
                // Pull up to 6 titles per feed for better synthesis
                const matches = text.match(/<title>(.*?)<\/title>/g)?.slice(1, 7); 
                if (matches) headlines += matches.map(m => m.replace(/<\/?title>/g, '')).join(". ") + ". ";
            } catch (e) { console.log(`⚠️ Skipping ${url}`); }
        }

        // 3. GENERATE SCRIPT WITH IDENTITY & GUARDRAILS
        const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ 
                    role: "system", 
                    content: `You are Abiola Hassan Chidi, the lead AI news anchor for this Nigerian Diaspora radio station. 
                    
                    IDENTITY & TONE:
                    - You are professional, warm, and Pan-Nigerian (unifying all ethnic groups).
                    - Use inclusive language like "Our nation" and "Back home."
                    
                    EDITORIAL GUARDRAILS:
                    - Maintain strict objectivity on political matters.
                    - Spell difficult names phonetically in brackets (e.g. [Ah-kwa Ee-bom]) for the voice engine.
                    
                    STRUCTURE (Target 450 words / ~120-150 seconds):
                    1. INTRO: "I am Abiola Hassan Chidi, and this is your global Nigerian update."
                    2. TOP NEWS: Detailed summary based on: ${headlines}
                    3. MONEY MINUTE: Report these rates: ${forexData}. Add a brief professional tip on remittances.
                    4. GLOBAL WEATHER: Mention the general weather vibe in Lagos, London, and Houston.
                    5. HERITAGE MOMENT: Share an 'On This Day' fact from Nigerian history.
                    6. SIGN-OFF: A traditional Nigerian proverb, its meaning, and your catchphrase: "I am Abiola Hassan Chidi; stay proud, and stay connected."`
                },
                { role: "user", content: "Write today's full 450-word broadcast script." }]
            })
        });
        const gptData = await gptRes.json();
        const script = gptData.choices[0].message.content;
        console.log(`📝 Script length: ${script.split(' ').length} words.`);

        // 4. SYNTHESIZE VOICE (OpenAI Onyx)
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({ model: "tts-1", voice: "onyx", input: script })
        });
        const audioBuffer = await ttsRes.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const fileName = `daily_news_bulletin.mp3`; // Fixed name = Overwrites old file

        // 5. UPLOAD TO AZURACAST (Overwrite existing)
        console.log(`📤 Uploading update to AzuraCast...`);
        const uploadRes = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
            method: "POST",
            headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ path: fileName, file: base64Audio })
        });

        const uploadData = await uploadRes.json();
        const fileId = uploadData.id || uploadData.unique_id;

        // 6. FINALIZE PLAYLIST SYNC
        // Delay ensures AzuraCast has finished disk-writing before we update the playlist
        await new Promise(resolve => setTimeout(resolve, 3000));
        await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/file/${fileId}`, {
            method: "PUT",
            headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ playlists: [parseInt(PLAYLIST_ID)] })
        });

        console.log("🎯 Success! Abiola Hassan Chidi is live with the latest update.");

    } catch (err) {
        console.error("❌ Automation Failed:", err.message);
        process.exit(1);
    }
}

run();
