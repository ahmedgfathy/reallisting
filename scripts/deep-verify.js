const { Client, Databases, Query } = require('node-appwrite');
require('dotenv').config();

async function run() {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    const db = new Databases(client);

    console.log('Checking message counts...');
    try {
        const r1 = await db.listDocuments(process.env.APPWRITE_DATABASE_ID, 'messages', [Query.limit(1)]);
        console.log('Total reported by listDocuments:', r1.total);

        const r2 = await db.listDocuments(process.env.APPWRITE_DATABASE_ID, 'messages', [Query.limit(1), Query.offset(5000)]);
        console.log('Results at offset 5000:', r2.documents.length);

        const r3 = await db.listDocuments(process.env.APPWRITE_DATABASE_ID, 'messages', [Query.limit(1), Query.offset(10000)]);
        console.log('Results at offset 10000:', r3.documents.length);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();
