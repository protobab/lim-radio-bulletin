const AZ_URL = process.env.AZ_URL?.replace(/\/$/, '');
const AZ_KEY = process.env.AZ_KEY;
const AZ_STATION_ID = process.env.AZ_STATION_ID;

const DAILY_QUERIES = [
    'collection:(78rpm_african)', 'subject:"Highlife"', 'subject:"Afrobeat"',
    'subject:"Classical Music"', 'subject:"Country Music"', 'subject:"Folk Music"'
];

const SUNDAY_QUERIES = [
    'collection:(Gospel_Music_Archive)', 'subject:"Hymns"', 'subject:"Christian Worship"'
];

async function getArchiveTracks(queries, targetCount) {
    let allTracks = [];
    for (const q of queries) {
        try {
            // Updated search to ensure we only get items with MP3s
            const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)} AND mediatype:(audio)&fl[]=identifier&rows=100&output=json`;
            const res = await fetch(searchUrl);
            const data = await res.json();
            if (data.response && data.response.docs) {
                allTracks.push(...data.response.docs);
            }
        } catch (e) { console.log(`⚠️ Search error for ${q}: ${e.message}`); }
    }
    return allTracks.sort(() => 0.5 - Math.random()).slice(0, targetCount);
}

async function sync() {
    const isSunday = new Date().getDay() === 0;
    const queries = isSunday ? SUNDAY_QUERIES : DAILY_QUERIES;
    const folder = isSunday ? "sunday_worship" : "daily_mix";
    const targetCount = 100;

    console.log(`🚀 Starting Sync for ${folder}...`);
    const trackItems = await getArchiveTracks(queries, targetCount);
    
    if (trackItems.length === 0) {
        console.error("❌ No tracks found in Archive.org. Check your queries.");
        return;
    }

    let successCount = 0;

    for (let i = 0; i < trackItems.length; i++) {
        const id = trackItems[i].identifier;
        const trackUrl = `https://archive.org/download/${id}/${id}_vbr.mp3`;
        const fileName = `track_${successCount}.mp3`;
        const fullPath = `${folder}/${fileName}`;

        try {
            console.log(`📡 [${successCount + 1}/${targetCount}] Fetching: ${id}`);
            const audioRes = await fetch(trackUrl, { redirect: 'follow' });
            
            if (!audioRes.ok) {
                console.log(`⏩ Skipping ${id}: Source returned ${audioRes.status}`);
                continue;
            }

            const blob = await audioRes.blob();
            if (blob.size < 1000000) { // Skip files smaller than 1MB
                console.log(`⏩ Skipping ${id}: File too small (${(blob.size/1024).toFixed(0)} KB)`);
                continue;
            }

            // Convert Blob to Buffer for the API
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // UPLOAD USING MULTIPART FORM DATA (Much more reliable)
            const formData = new FormData();
            formData.append('file', new Blob([buffer]), fileName);
            formData.append('path', fullPath);

            const uploadRes = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
                method: "POST",
                headers: { "X-API-Key": AZ_KEY },
                body: formData
            });

            if (uploadRes.ok) {
                console.log(`✅ Uploaded: ${fileName}`);
                successCount++;
                // Small pause to prevent API rate limiting
                await new Promise(r => setTimeout(r, 2000));
            } else {
                const errText = await uploadRes.text();
                console.log(`⚠️ AzuraCast Rejected ${fileName}: ${errText}`);
            }

            if (successCount >= targetCount) break;

        } catch (e) {
            console.log(`❌ Error processing ${id}: ${e.message}`);
        }
    }

    console.log(`🎯 Sync Complete! Total files in ${folder}: ${successCount}`);
}

sync();
