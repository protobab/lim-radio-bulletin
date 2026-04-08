const AZ_URL = process.env.AZ_URL?.replace(/\/$/, '');
const AZ_KEY = process.env.AZ_KEY;
const AZ_STATION_ID = process.env.AZ_STATION_ID;

// Expanded search queries to ensure we always find enough files
const DAILY_QUERIES = [
    'collection:(78rpm_african)',
    'subject:"Highlife"',
    'subject:"Afrobeat"',
    'subject:"Nigerian Music"'
];

const SUNDAY_QUERIES = [
    'collection:(Gospel_Music_Archive)',
    'subject:"Hymns"',
    'subject:"Christian Worship"'
];

async function getArchiveTracks(queries, targetCount) {
    let allTracks = [];
    for (const q of queries) {
        try {
            const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&rows=100&output=json`;
            const res = await fetch(searchUrl);
            const data = await res.json();
            if (data.response.docs) allTracks.push(...data.response.docs);
        } catch (e) { console.log(`⚠️ Search failed for query: ${q}`); }
    }
    // Shuffle and pick
    return allTracks.sort(() => 0.5 - Math.random()).slice(0, targetCount);
}

async function sync() {
    const isSunday = new Date().getDay() === 0;
    const queries = isSunday ? SUNDAY_QUERIES : DAILY_QUERIES;
    const folder = isSunday ? "sunday_worship" : "daily_mix";
    const targetCount = 20; // Ensure 20 songs per day

    console.log(`🚀 Lives In Motion: Finding ${targetCount} fresh tracks for ${folder}...`);
    const trackItems = await getArchiveTracks(queries, targetCount);
    let successCount = 0;

    for (let i = 0; i < trackItems.length; i++) {
        try {
            const id = trackItems[i].identifier;
            // Using a more reliable direct download URL pattern from Archive.org
            const trackUrl = `https://archive.org/download/${id}/${id}_vbr.mp3`;
            
            console.log(`⏳ Downloading track ${successCount + 1}: ${id}`);
            const res = await fetch(trackUrl, { redirect: 'follow' });
            
            if (!res.ok) continue;
            
            const arrayBuffer = await res.arrayBuffer();
            if (arrayBuffer.byteLength < 800000) continue; // Skip if less than ~0.8MB (invalid/short)

            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const fileName = `track_${successCount}.mp3`;

            const upload = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
                method: "POST",
                headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ path: `${folder}/${fileName}`, file: base64 })
            });

            if (upload.ok) {
                console.log(`✅ Synced: ${fileName}`);
                successCount++;
            }
            
            if (successCount >= targetCount) break;

        } catch (e) { console.log(`❌ Skipping track ${i} due to error.`); }
    }

    console.log(`🎯 Successfully updated ${successCount} tracks.`);
    
    // Final Reprocess to tell AzuraCast the files have changed
    await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/batch/reprocess`, {
        method: "POST",
        headers: { "X-API-Key": AZ_KEY }
    });
}

sync();
