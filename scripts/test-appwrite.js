const { Client, Databases } = require('node-appwrite');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function test() {
    console.log('Testing Appwrite Connection...');
    console.log('Project ID:', process.env.APPWRITE_PROJECT_ID);
    try {
        const response = await databases.listCollections(process.env.APPWRITE_DATABASE_ID);
        console.log('✅ Connection Successful!');
        console.log('Total Collections:', response.total);
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
        if (error.response) console.error('Response:', error.response);
    }
}

test();
