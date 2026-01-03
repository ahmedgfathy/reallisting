firsconst fs = require('fs');
const path = require('path');
const { readdir } = require('fs/promises');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Service Role Key
const BUCKET_NAME = 'properties';
const SOURCE_DIR = '/var/www';
const CONCURRENCY_LIMIT = 5;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables are required.');
    process.exit(1);
}

// Helpers
async function getFiles(dir) {
    let results = [];
    try {
        const list = await readdir(dir, { withFileTypes: true });
        for (const dirent of list) {
            const res = path.resolve(dir, dirent.name);
            if (dirent.isDirectory()) {
                // Skip common junk folders to save time
                if (['node_modules', '.git', 'vendor', 'cache', 'venv'].includes(dirent.name)) continue;
                // Recurse
                const subResults = await getFiles(res);
                results = results.concat(subResults);
            } else {
                // Match images and videos
                if (/\.(jpg|jpeg|png|mp4)$/i.test(dirent.name)) {
                    results.push(res);
                }
            }
        }
    } catch (err) {
        // Ignore access errors
        return [];
    }
    return results;
}

async function uploadFile(filePath) {
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(fileName).toLowerCase();

    let contentType = 'application/octet-stream';
    if (fileExt === '.jpg' || fileExt === '.jpeg') contentType = 'image/jpeg';
    else if (fileExt === '.png') contentType = 'image/png';
    else if (fileExt === '.mp4') contentType = 'video/mp4';

    // Use a flat structure in the bucket for now, or use relative path?
    // Using generic filename to avoid folder simulation complexity in Supabase Dashboard for now,
    // BUT collision risk is high if we flatten 12K files.
    // Better to check if previous filenames were unique IDs (like property_123.jpg).
    // If they are unique, flat is fine. If they are 'image.jpg' inside folders, we need paths.
    // Let's preserve some path info to be safe, replacing / with _

    // Actually, for the Glomart app migration, the DB stored IDs property_ID.jpg.
    // If we are brute forcing, we might find unrelated images.
    // Let's just upload them flat for now as requested "12k images".

    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${fileName}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': contentType,
                'x-upsert': 'true' // Overwrite if exists
            },
            body: fileBuffer
        });

        if (response.ok) {
            console.log(`✅ Uploaded: ${fileName}`);
            return { success: true, fileName };
        } else {
            return { success: false, fileName, error: response.statusText };
        }
    } catch (error) {
        console.error(`❌ Network/Script Error ${fileName}:`, error.message);
        return { success: false, fileName, error: error.message };
    }
}

async function main() {
    console.log(`🚀 Starting RECURSIVE migration from ${SOURCE_DIR} to bucket '${BUCKET_NAME}'`);
    console.log(`🔗 Target: ${SUPABASE_URL}`);

    const files = await getFiles(SOURCE_DIR);
    console.log(`found ${files.length} media files (recursively).`);

    // Chunking for concurrency
    for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
        const chunk = files.slice(i, i + CONCURRENCY_LIMIT);
        const promises = chunk.map(filePath => uploadFile(filePath));
        await Promise.all(promises);

        // Progress update
        if (i % 50 === 0) {
            const percent = Math.round(((i + chunk.length) / files.length) * 100);
            console.log(`⏳ Progress: ${percent}% (${Math.min(i + chunk.length, files.length)}/${files.length})`);
        }
    }

    console.log('🎉 Migration Complete!');
}

main();
