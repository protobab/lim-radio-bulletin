const AZ_URL = process.env.AZ_URL?.replace(/\/$/, '');
const AZ_KEY = process.env.AZ_KEY;
const AZ_STATION_ID = process.env.AZ_STATION_ID;

// FAMILY FRIENDLY / AFRO-VIBE (Monday-Saturday)
const DAILY_URLS = [
    "https://upload.wikimedia.org/wikipedia/commons/3/36/A_Day_In_The_Sun_-_Tim_Beutler.mp3",
    "https://upload.wikimedia.org/wikipedia/commons/6/6e/Kpanlogo_Rhythm_Section.mp3",
    "https://archive.org/download/lp_highlife-today_the-african-brothers-band/disc1/01.01.%20Self-Reliance_sample.mp3"
];

// CHRISTIAN / WORSHIP (Sunday)
const SUNDAY_URLS = [
    "https://upload.wikimedia.org/wikipedia/commons/5/5b/Amazing_Grace_Jazz_Trio.mp3",
    "https://archive.org/download/mjosephnj_gmail_0112/1%20Faithful%20And%20True%20-%20Calvary%20Chapel%20Saving%20Grace.mp3",
    "https://archive.org/download/mjosephnj_gmail_0112/2%20Psalm%208%20-%20Calvary%20Chapel%20Saving%20Grace.mp3"
];

async function sync() {
    const isSunday = new Date().getDay() === 0;
    const sources = isSunday ? SUNDAY_URLS : DAILY_URLS;
    const folder = isSunday ? "sunday_worship" : "daily_mix";

    console.log(`🎵 Syncing ${folder} for Lives In Motion...`);

    for (let i = 0; i < sources.length; i++) {
        try {
            const res = await fetch(sources[i]);
            const buffer = await res.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const fileName = `track_${i}.mp3`;

            await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
                method: "POST",
                headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ path: `${folder}/${fileName}`, file: base64 })
            });
            console.log(`✅ Uploaded ${fileName} to ${folder}`);
        } catch (e) {
            console.log(`❌ Failed to sync track ${i}: ${e.message}`);
        }
    }
}
sync();
