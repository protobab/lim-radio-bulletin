const AZ_URL = process.env.AZ_URL?.replace(/\/$/, '');
const AZ_KEY = process.env.AZ_KEY;
const AZ_STATION_ID = process.env.AZ_STATION_ID;

const DAILY_URLS = [
    // AFRO-HIGHLIFE & CLASSICS
    "https://archive.org/download/lp_highlife-today_the-african-brothers-band/disc1/01.01.%20Self-Reliance_sample.mp3",
    "https://archive.org/download/78_nwayo-nwayo-easy-does-it_the-starlight-melodymakers-e-c-ariz_gbia0011503a/01%20-%20Nwayo%20Nwayo%20%28Easy%20Does%20It%29.mp3",
    "https://upload.wikimedia.org/wikipedia/commons/6/6e/Kpanlogo_Rhythm_Section.mp3",
    "https://upload.wikimedia.org/wikipedia/commons/3/36/A_Day_In_The_Sun_-_Tim_Beutler.mp3",
    // ACOUSTIC & FAMILY FRIENDLY
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    "https://archive.org/download/soft-background-music-for-videos-vlog-no-copyright-royalty-free-music/Soft%20Background%20Music%20For%20Videos%20%26%20Vlog%20-%20No%20Copyright%20Royalty%20Free%20Music.mp3"
    // Note: You can add up to 50 links here
];

const SUNDAY_URLS = [
    // CONTEMPORARY GOSPEL & WORSHIP
    "https://upload.wikimedia.org/wikipedia/commons/5/5b/Amazing_Grace_Jazz_Trio.mp3",
    "https://archive.org/download/mjosephnj_gmail_0112/1%20Faithful%20And%20True%20-%20Calvary%20Chapel%20Saving%20Grace.mp3",
    "https://archive.org/download/mjosephnj_gmail_0112/2%20Psalm%208%20-%20Calvary%20Chapel%20Saving%20Grace.mp3",
    "https://archive.org/download/mjosephnj_gmail_0112/4%20In%20The%20Light%20Of%20Your%20Grace%20-%20Saving%20Grace.mp3",
    "https://archive.org/download/mjosephnj_gmail_0112/5%20Holy%20Is%20The%20Lord%20-%20Saving%20Grace.mp3",
    "https://archive.org/download/GospelMusicArchive/JoyfulJoyful.mp3"
];

async function sync() {
    const isSunday = new Date().getDay() === 0;
    const sources = isSunday ? SUNDAY_URLS : DAILY_URLS;
    const folder = isSunday ? "sunday_worship" : "daily_mix";

    console.log(`🎵 Lives In Motion: Syncing ${sources.length} tracks to ${folder}...`);

    for (let i = 0; i < sources.length; i++) {
        try {
            const res = await fetch(sources[i]);
            if (!res.ok) continue;
            const arrayBuffer = await res.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            
            // Fixed filenames so AzuraCast keeps them in the playlist rotation
            const fileName = `track_${i}.mp3`;

            await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
                method: "POST",
                headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ path: `${folder}/${fileName}`, file: base64 })
            });
            console.log(`✅ Synced: ${fileName}`);
        } catch (e) { console.log(`❌ Track ${i} failed.`); }
    }

    console.log("🔄 Reprocessing Media Library...");
    await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/batch/reprocess`, {
        method: "POST",
        headers: { "X-API-Key": AZ_KEY }
    });
}
sync();
