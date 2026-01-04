const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const output = {
    endpoint: process.env.APPWRITE_ENDPOINT || 'not set',
    projectId: process.env.APPWRITE_PROJECT_ID ? 'set' : 'not set',
    apiKey: process.env.APPWRITE_API_KEY ? 'set' : 'not set',
    databaseId: process.env.APPWRITE_DATABASE_ID ? 'set' : 'not set',
    cwd: process.cwd(),
    envPath: path.join(__dirname, '../.env'),
    envExists: fs.existsSync(path.join(__dirname, '../.env'))
};

fs.writeFileSync('env_check.json', JSON.stringify(output, null, 2));
console.log('Env check written to env_check.json');
