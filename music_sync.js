const AZ_URL = process.env.AZ_URL?.replace(/\/$/, '');
const AZ_KEY = process.env.AZ_KEY;
const AZ_STATION_ID = process.env.AZ_STATION_ID;

// Curated high-quality, royalty-free direct MP3 links
const FAMILY_FRIENDLY_MUSIC = [
    "https://upload.wikimedia.org/wikipedia/commons/e/db/Tim_Beutler_-_A_Day_In_The_Sun.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    // We can add more direct links to Creative Commons Afro-pop/Highlife here
];

const SUNDAY_CHRISTIAN_MUSIC = [
    "https://upload.wikimedia.org/wikipedia/commons/5/5b/Amazing_Grace_Jazz_Trio.mp3",
    "https://www.worshipstart.com/s/Ancient-Ones-Katie-Overbeek-Instrumental.mp3"
];

async function syncMusic() {
    const isSunday = new Date().getDay() === 0;
    const tracks = isSunday ? SUNDAY_CHRISTIAN_MUSIC : FAMILY_FRIENDLY_MUSIC;
    const playlistName = isSunday ? "Sunday_Worship" : "Daily_Family_Mix";

    console.log(`🎵 Syncing ${playlistName} for Lives In Motion...`);

    for (let i = 0; i < tracks.length; i++) {
        try {
            const audioUrl = tracks[i];
            const response = await fetch(audioUrl);
            const buffer = await response.arrayBuffer();
            const base64Audio = Buffer.from(audioBuffer).toString('base64');
            const fileName = `filler_${isSunday ? 'sun' : 'day'}_${i}.mp3`;

            // Upload to AzuraCast
            await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
                method: "POST",
                headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ path: `music/${fileName}`, file: base64Audio })
            });
            console.log(`✅ Synced: ${fileName}`);
        } catch (e) {
            console.log(`❌ Failed to pull track ${i}`);
        }
    }
}
syncMusic();
