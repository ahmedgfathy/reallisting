const fs = require('fs');
const path = require('path');
const { readdir } = require('fs/promises');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Service Role Key
const BUCKET_NAME = 'properties';
const SOURCE_DIR = '/var/www/real_estate_crm/app/public/properties';
const CONCURRENCY_LIMIT = 5;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables are required.');
    process.exit(1);
}

// Helpers
async function getFiles(dir) {
    try {
        const dirents = await readdir(dir, { withFileTypes: true });
        // We only care about files in the root of SOURCE_DIR based on previous `ls` output
        const files = dirents
            .filter(dirent => dirent.isFile())
            .map(dirent => dirent.name)
            .filter(name => /\.(jpg|jpeg|png|mp4)$/i.test(name));
        return files;
    } catch (err) {
        console.error(`❌ Error reading directory ${dir}:`, err.message);
        process.exit(1);
    }
}

async function uploadFile(fileName) {
    const filePath = path.join(SOURCE_DIR, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(fileName).toLowerCase();

    let contentType = 'application/octet-stream';
    if (fileExt === '.jpg' || fileExt === '.jpeg') contentType = 'image/jpeg';
    else if (fileExt === '.png') contentType = 'image/png';
    else if (fileExt === '.mp4') contentType = 'video/mp4';

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
            const text = await response.text();
            console.error(`❌ Failed: ${fileName} - Status: ${response.status} - ${text}`);
            return { success: false, fileName, error: text };
        }
    } catch (error) {
        console.error(`❌ Network/Script Error ${fileName}:`, error.message);
        return { success: false, fileName, error: error.message };
    }
}

async function main() {
    console.log(`🚀 Starting migration from ${SOURCE_DIR} to bucket '${BUCKET_NAME}'`);
    console.log(`🔗 Target: ${SUPABASE_URL}`);

    const files = await getFiles(SOURCE_DIR);
    console.log(`found ${files.length} media files.`);

    // Chunking for concurrency
    for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
        const chunk = files.slice(i, i + CONCURRENCY_LIMIT);
        const promises = chunk.map(file => uploadFile(file));
        await Promise.all(promises);

        // Progress update
        const percent = Math.round(((i + chunk.length) / files.length) * 100);
        console.log(`⏳ Progress: ${percent}% (${Math.min(i + chunk.length, files.length)}/${files.length})`);
    }

    console.log('🎉 Migration Complete!');
}

main();
