require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 5001;

app.use(cors());
app.use(bodyParser.json());

// Helper to simulate Appwrite Function context
const createContext = (req, res) => {
    return {
        req: {
            method: req.method,
            body: req.body,
            query: req.query,
            headers: req.headers,
            path: req.path
        },
        res: {
            json: (data, status = 200, headers = {}) => {
                Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
                return res.status(status).json(data);
            },
            text: (data, status = 200, headers = {}) => {
                Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
                return res.status(status).send(data);
            },
            redirect: (url, status = 301) => res.redirect(status, url)
        },
        log: (...args) => console.log('[LOG]', ...args),
        error: (...args) => console.error('[ERROR]', ...args)
    };
};

// Route all API calls to the local files in /api
app.all('/api/:functionId*', async (req, res) => {
    const { functionId } = req.params;
    const apiPath = path.join(__dirname, '..', 'api', `${functionId}.js`);

    console.log(`[${req.method}] Proxying to local function: ${functionId}`);

    if (!fs.existsSync(apiPath)) {
        return res.status(404).json({ error: `Function ${functionId} not found locally at ${apiPath}` });
    }

    try {
        // Clear cache for hot reloading
        delete require.cache[require.resolve(apiPath)];
        const handler = require(apiPath);

        // Appwrite functions expect (context) => {}
        const context = createContext(req, res);

        // Adjust req.path to exclude /api/functionId
        context.req.path = req.path.replace(`/api/${functionId}`, '') || '/';
        if (!context.req.path.startsWith('/')) context.req.path = '/' + context.req.path;

        await handler(context);
    } catch (err) {
        console.error(`Error executing function ${functionId}:`, err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

app.listen(port, () => {
    console.log(`🚀 Local Appwrite Function Runner listening at http://localhost:${port}`);
    console.log(`👉 Point your React app's apiCall to this server for local development.`);
});
