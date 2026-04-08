const AZ_URL = process.env.AZ_URL?.replace(/\/$/, '');
const AZ_KEY = process.env.AZ_KEY;
const AZ_STATION_ID = process.env.AZ_STATION_ID;

// Function to get random items from an Internet Archive Collection
async function getArchiveTracks(query, count) {
    try {
        const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier&rows=50&output=json`;
        const res = await fetch(searchUrl);
        const data = await res.json();
        const items = data.response.docs;
        
        // Shuffle and pick 'count' items
        const shuffled = items.sort(() => 0.5 - Math.random()).slice(0, count);
        return shuffled.map(item => `https://archive.org/download/${item.identifier}/${item.identifier}_vbr.mp3`);
    } catch (e) {
        console.log("⚠️ Archive search failed, using fallbacks.");
        return [];
    }
}

async function sync() {
    const isSunday = new Date().getDay() === 0;
    const folder = isSunday ? "sunday_worship" : "daily_mix";
    
    // Define search queries for variety
    const query = isSunday 
        ? 'collection:(Gospel_Music_Archive) AND mediatype:(audio)' 
        : 'collection:(78rpm_african) AND mediatype:(audio)';

    console.log(`🚀 Lives In Motion: Fetching 15 fresh tracks for ${folder}...`);
    let tracks = await getArchiveTracks(query, 15);

    // Fallback SoundHelix links (Verified to always work)
    if (tracks.length === 0) {
        tracks = ["https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"];
    }

    for (let i = 0; i < tracks.length; i++) {
        try {
            // Updated fetch to handle redirects correctly
            const res = await fetch(tracks[i], { redirect: 'follow' });
            if (!res.ok) continue;

            const arrayBuffer = await res.arrayBuffer();
            // Check if the file is too small (likely a failed HTML redirect page)
            if (arrayBuffer.byteLength < 500000) { 
                console.log(`⏩ Skipping track ${i}: File too small/invalid.`);
                continue; 
            }

            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const fileName = `track_${i}.mp3`;

            await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
                method: "POST",
                headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ path: `${folder}/${fileName}`, file: base64 })
            });
            console.log(`✅ Synced: ${fileName}`);
        } catch (e) { console.log(`❌ Track ${i} Error: ${e.message}`); }
    }

    console.log("🔄 Reprocessing Media Library...");
    await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/batch/reprocess`, {
        method: "POST",
        headers: { "X-API-Key": AZ_KEY }
    });
}
sync();
