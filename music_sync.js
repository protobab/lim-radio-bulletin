const AZ_URL = process.env.AZ_URL?.replace(/\/$/, '');
const AZ_KEY = process.env.AZ_KEY;
const AZ_STATION_ID = process.env.AZ_STATION_ID;

const DAILY_QUERIES = [
    'collection:(78rpm_african)', 'subject:"Highlife"', 'subject:"Afrobeat"',
    'collection:(georgia-country-music)', 'subject:"Classical Music"', 
    'subject:"Country Music"', 'subject:"Folk Music"'
];

const SUNDAY_QUERIES = [
    'collection:(Gospel_Music_Archive)', 'subject:"Hymns"', 'subject:"Contemporary Christian"'
];

async function getArchiveTracks(queries, targetCount) {
    let allTracks = [];
    for (const q of queries) {
        try {
            const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)} AND mediatype:(audio) AND format:(VBR MP3)&fl[]=identifier&rows=50&output=json`;
            const res = await fetch(searchUrl);
            const data = await res.json();
            if (data.response.docs) allTracks.push(...data.response.docs);
        } catch (e) { console.log(`⚠️ Search failed for: ${q}`); }
    }
    return allTracks.sort(() => 0.5 - Math.random()).slice(0, targetCount);
}

async function sync() {
    const isSunday = new Date().getDay() === 0;
    const queries = isSunday ? SUNDAY_QUERIES : DAILY_QUERIES;
    const folder = isSunday ? "sunday_worship" : "daily_mix";
    const targetCount = 100; // Your new 100-song target

    console.log(`🚀 Lives In Motion: Targeting ${targetCount} tracks...`);
    const trackItems = await getArchiveTracks(queries, targetCount);
    let successCount = 0;

    for (let i = 0; i < trackItems.length; i++) {
        try {
            const id = trackItems[i].identifier;
            const trackUrl = `https://archive.org/download/${id}/${id}_vbr.mp3`;
            
            const res = await fetch(trackUrl, { redirect: 'follow' });
            if (!res.ok) continue;
            
            const arrayBuffer = await res.arrayBuffer();
            if (arrayBuffer.byteLength < 1000000) continue; // Must be at least 1MB for quality

            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const fileName = `track_${successCount}.mp3`;

            const upload = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
                method: "POST",
                headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ path: `${folder}/${fileName}`, file: base64 })
            });

            if (upload.ok) {
                console.log(`✅ [${successCount + 1}/${targetCount}] Synced: ${fileName}`);
                successCount++;
                // PAUSE for 3 seconds to let the server breathe
                await new Promise(r => setTimeout(r, 3000));
            }
            
            if (successCount >= targetCount) break;

        } catch (e) { console.log(`❌ Error on track ${i}: ${e.message}`); }
    }

    console.log(`🎯 Final Count: ${successCount} songs updated.`);
    await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/batch/reprocess`, {
        method: "POST",
        headers: { "X-API-Key": AZ_KEY }
    });
}

sync();
