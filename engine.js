const fs = require('fs');

const DAILY_QUERIES = [
    'collection:(78rpm_african)', 'subject:"Highlife"', 'subject:"Afrobeat"',
    'subject:"Classical Music"', 'subject:"Country Music"', 'subject:"Folk Music"'
];

const SUNDAY_QUERIES = [
    'collection:(Gospel_Music_Archive)', 'subject:"Hymns"', 'subject:"Christian Worship"'
];

async function generatePlaylist() {
    const isSunday = new Date().getDay() === 0;
    const queries = isSunday ? SUNDAY_QUERIES : DAILY_QUERIES;
    const fileName = isSunday ? "sunday_worship.m3u" : "daily_mix.m3u";
    
    console.log(`🔎 Searching Archive.org for 100 tracks (${fileName})...`);
    let playlistContent = "#EXTM3U\n";
    let foundCount = 0;

    for (const q of queries) {
        if (foundCount >= 100) break;
        try {
            const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)} AND mediatype:(audio)&fl[]=identifier&rows=50&output=json`;
            const res = await fetch(searchUrl);
            const data = await res.json();
            const items = data.response?.docs || [];

            for (const item of items) {
                if (foundCount >= 100) break;
                // Generate the direct MP3 link
                const link = `https://archive.org/download/${item.identifier}/${item.identifier}_vbr.mp3`;
                playlistContent += `#EXTINF:-1,${item.identifier}\n${link}\n`;
                foundCount++;
            }
        } catch (e) { 
            console.log(`⚠️ Query failed for ${q}: ${e.message}`); 
        }
    }

    if (foundCount > 0) {
        fs.writeFileSync(fileName, playlistContent);
        console.log(`✅ Success! Created ${fileName} with ${foundCount} links.`);
    } else {
        console.error("❌ No tracks found. The script cannot create an empty playlist.");
        process.exit(1);
    }
}

generatePlaylist();
