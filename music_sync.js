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

async function sync() {
    const isSunday = new Date().getDay() === 0;
    const queries = isSunday ? SUNDAY_QUERIES : DAILY_QUERIES;
    const folderName = isSunday ? "sunday_worship" : "daily_mix";
    const targetCount = 100;

    console.log(`🚀 Starting Sync for ${folderName}...`);

    // 1. Create the folder first (Prevents 404 errors)
    try {
        await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/directory`, {
            method: "POST",
            headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ name: folderName })
        });
    } catch (e) { console.log("Folder check done."); }

    // 2. Fetch tracks from Archive.org
    let allIdentifiers = [];
    for (const q of queries) {
        const res = await fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)} AND mediatype:(audio)&fl[]=identifier&rows=150&output=json`);
        const data = await res.json();
        if (data.response?.docs) allIdentifiers.push(...data.response.docs);
    }

    const shuffled = allIdentifiers.sort(() => 0.5 - Math.random()).slice(0, targetCount);
    let successCount = 0;

    for (let i = 0; i < shuffled.length; i++) {
        const id = shuffled[i].identifier;
        const trackUrl = `https://archive.org/download/${id}/${id}_vbr.mp3`;

        try {
            console.log(`📡 [${successCount + 1}/${targetCount}] Fetching: ${id}`);
            const audioRes = await fetch(trackUrl);
            if (!audioRes.ok) continue;

            const arrayBuffer = await audioRes.arrayBuffer();
            if (arrayBuffer.byteLength < 1000000) continue; // Skip files < 1MB

            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const fileName = `track_${successCount}.mp3`;

            const uploadRes = await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/files`, {
                method: "POST",
                headers: { "X-API-Key": AZ_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    path: `${folderName}/${fileName}`, 
                    file: base64 
                })
            });

            if (uploadRes.ok) {
                console.log(`✅ Uploaded ${fileName}`);
                successCount++;
                await new Promise(r => setTimeout(r, 2000)); // 2-second gap
            } else {
                const err = await uploadRes.text();
                console.log(`⚠️ Failed ${fileName}: ${err}`);
            }

            if (successCount >= targetCount) break;

        } catch (e) { console.log(`❌ Error: ${e.message}`); }
    }

    console.log(`🎯 Sync Complete! Total: ${successCount}`);
    
    // Reprocess Media
    await fetch(`${AZ_URL}/api/station/${AZ_STATION_ID}/batch/reprocess`, {
        method: "POST",
        headers: { "X-API-Key": AZ_KEY }
    });
}

sync();
