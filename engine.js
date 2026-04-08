const AZ_URL = process.env.AZ_URL?.replace(/\/$/, '');
const AZ_KEY = process.env.AZ_KEY;
const AZ_STATION_ID = process.env.AZ_STATION_ID;
const OPENAI_KEY = process.env.OPENAI_KEY;
const PLAYLIST_ID = process.env.AZ_PLAYLIST_ID;
// Added safety checks for WordPress variables
const WP_URL = process.env.WP_URL ? process.env.WP_URL.replace(/\/$/, '') : null;
const WP_USER = process.env.WP_USER;
const WP_APP_PASS = process.env.WP_APP_PASS;

const RSS_FEEDS = [
    "https://vanguardngr.com/feed",
    "https://www.premiumtimesng.com/feed",
    "https://guardian.ng/feed/",
    "https://punchng.com/feed/",
    "https://feeds.bbci.co.uk/news/world/africa/rss.xml"
];

async function run() {
    console.log("🚀 Starting Lives In Motion: Abiola Hassan Chidi Full Automation...");

    try {
        // 1. Fetch Exchange Rates
        let forexData = "Rates unavailable.";
        try {
            const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
            const fxJSON = await fxRes.json();
            const ngn = fxJSON.rates.NGN;
            forexData = `USD to Naira is ${ngn}. GBP to Naira is ${(ngn / fxJSON.rates.GBP).toFixed(2)}.`;
        } catch (e) { console.log("⚠️ Forex failed"); }

        // 2. Fetch News
        let headlines = "";
        for (const url of RSS_FEEDS) {
            try {
                const res = await fetch(url);
                const text = await res.text();
                const matches = text.match(/<title>(.*?)<\/title>/g)?.slice(1, 6); 
                if (matches) headlines += matches.map(m => m.replace(/<\/?title>/g, '')).join(". ") + ". ";
            } catch (e) { console.log(`⚠️ Skipping ${url}`); }
        }

        // 3. Generate Script
        const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ 
                    role: "system", 
                    content: `You are Abiola Hassan Chidi, the AI news anchor for Lives In Motion radio. Write a professional 450-word broadcast script.
                    Structure: 1. Intro, 2. News (${headlines}), 3. Money Minute (${forexData}), 4. Global Weather (Lagos/London/Houston), 5. Heritage Fact, 6. Proverb & Sign-off.`
                },
                { role: "user", content: "Write today's broadcast script for Lives In Motion." }]
            })
        });
        const gptData = await gptRes.json();
        const script = gptData.choices[0].message.content;

        // 4. Update AzuraCast
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({ model: "tts-1", voice: "onyx", input: script })
        });
        const audioBuffer = await ttsRes.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const fileName = `daily_news_bulletin.mp3`;

        const uploadRes = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
            method: "POST",
            headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ path: fileName, file: base64Audio })
        });
        const upData = await uploadRes.json();
        const fileId = upData.id || upData.unique_id;

        await new Promise(r => setTimeout(r, 3000));
        await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/file/${fileId}`, {
            method: "PUT",
            headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ playlists: [parseInt(PLAYLIST_ID)] })
        });
        console.log("📻 Audio live on Lives In Motion.");

        // 5. AUTO-BLOGGING: Post script to WordPress
        if (!WP_URL || !WP_USER || !WP_APP_PASS) {
            console.log("⚠️ WordPress secrets missing in Workflow. Skipping blog post.");
            return;
        }

        console.log(`🌐 Publishing to ${WP_URL}...`);
        const auth = Buffer.from(`${WP_USER}:${WP_APP_PASS}`).toString('base64');
        const wpRes = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: `Lives In Motion Update: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                content: `<p>${script.replace(/\n/g, '</p><p>')}</p>`,
                status: 'publish'
            })
        });

        if (wpRes.ok) console.log("🎯 Blog post published successfully!");
        else {
            const err = await wpRes.text();
            console.log(`⚠️ WordPress failed: ${wpRes.status} - ${err}`);
        }

    } catch (err) {
        console.error("❌ Automation Failed:", err.message);
        process.exit(1);
    }
}
run();
