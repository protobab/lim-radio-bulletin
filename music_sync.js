const AZ_URL = process.env.AZ_URL?.replace(/\/$/, '');
const AZ_KEY = process.env.AZ_KEY;
const AZ_STATION_ID = process.env.AZ_STATION_ID;

// FAMILY FRIENDLY / AFRO-VIBE (Monday-Saturday)
const DAILY_URLS = [
    "https://upload.wikimedia.org/wikipedia/commons/3/36/A_Day_In_The_Sun_-_Tim_Beutler.mp3",
    "https://upload.wikimedia.org/wikipedia/commons/6/6e/Kpanlogo_Rhythm_Section.mp3"
];

// CHRISTIAN / WORSHIP (Sunday)
const SUNDAY_URLS = [
    "https://upload.wikimedia.org/wikipedia/commons/5/5b/Amazing_Grace_Jazz_Trio.mp3",
    "https://archive.org/download/mjosephnj_gmail_0112/1%20Faithful%20And%20True%20-%20Calvary%20Chapel%20Saving%20Grace.mp3"
];

async function sync() {
    const isSunday = new Date().getDay() === 0;
    const sources = isSunday ? SUNDAY_URLS : DAILY_URLS;
    const folder = isSunday ? "sunday_worship" : "daily_mix";

    console.log(`🎵 Syncing ${folder} for Lives In Motion... (Today is ${isSunday ? 'Sunday' : 'a Weekday'})`);

    for (let i = 0; i < sources.length; i++) {
        try {
            console.log(`⏳ Fetching track ${i} from source...`);
            const res = await fetch(sources[i]);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            
            const buffer = await res.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const fileName = `track_${i}.mp3`;

            console.log(`📤 Uploading ${fileName} to AzuraCast folder: ${folder}...`);
            const uploadRes = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
                method: "POST",
                headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ path: `${folder}/${fileName}`, file: base64 })
            });

            if (uploadRes.ok) {
                console.log(`✅ Successfully synced ${fileName}`);
            } else {
                const errText = await uploadRes.text();
                console.log(`⚠️ AzuraCast Upload Failed: ${errText}`);
            }
        } catch (e) {
            console.log(`❌ Error on track ${i}: ${e.message}`);
        }
    }
}
sync();
