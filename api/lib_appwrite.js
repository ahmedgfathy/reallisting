const { Client, Databases, Account, Query, Storage, ID, Functions } = require('node-appwrite');

// Appwrite Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '694ba83300116af11b75';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '695a84140031c5a93745';

// Initialize Appwrite Client
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

if (APPWRITE_API_KEY) {
    client.setKey(APPWRITE_API_KEY);
}

// Services
const databases = new Databases(client);
const account = new Account(client);
const storage = new Storage(client);
const functions = new Functions(client);

// Collection IDs
const COLLECTIONS = {
    USERS: 'users',
    MESSAGES: 'messages',
    REGIONS: 'regions'
};

// Helper function to check configuration
function isConfigured() {
    return Boolean(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID);
}

function getConfigError() {
    return {
        error: 'Appwrite is not configured',
        message: 'Please set APPWRITE_PROJECT_ID and APPWRITE_API_KEY environment variables',
        configured: false
    };
}

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
};

// User Authentication Helpers
async function createUser(mobile, password, name = '') {
    try {
        const email = `${mobile}@reallisting.app`;
        const user = await account.create(ID.unique(), email, password, name);
        await databases.createDocument(APPWRITE_DATABASE_ID, COLLECTIONS.USERS, user.$id, {
            mobile: mobile,
            role: 'broker',
            isActive: false,
            createdAt: new Date().toISOString()
        });
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loginUser(mobile, password) {
    try {
        const email = `${mobile}@reallisting.app`;
        const session = await account.createEmailPasswordSession(email, password);
        const userDoc = await databases.getDocument(APPWRITE_DATABASE_ID, COLLECTIONS.USERS, session.userId);
        return {
            success: true,
            session,
            user: {
                id: userDoc.$id,
                mobile: userDoc.mobile,
                role: userDoc.role,
                isActive: userDoc.isActive
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserBySession(sessionToken) {
    try {
        const sessionClient = new Client()
            .setEndpoint(APPWRITE_ENDPOINT)
            .setProject(APPWRITE_PROJECT_ID)
            .setSession(sessionToken);
        const sessionAccount = new Account(sessionClient);
        const user = await sessionAccount.get();
        const userDoc = await databases.getDocument(APPWRITE_DATABASE_ID, COLLECTIONS.USERS, user.$id);
        return {
            success: true,
            user: {
                id: userDoc.$id,
                mobile: userDoc.mobile,
                role: userDoc.role,
                isActive: userDoc.isActive,
                subscriptionEndDate: userDoc.subscriptionEndDate || null
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getMessages(filters = {}) {
    try {
        const { page = 1, limit = 50, search = '', category = '', propertyType = '', region = '', purpose = '' } = filters;
        const queries = [Query.limit(limit), Query.offset((page - 1) * limit), Query.orderDesc('$createdAt')];
        if (category && category !== 'الكل') queries.push(Query.equal('category', category));
        if (propertyType && propertyType !== 'الكل') queries.push(Query.equal('propertyType', propertyType));
        if (region && region !== 'الكل') queries.push(Query.equal('region', region));
        if (purpose && purpose !== 'الكل') queries.push(Query.equal('purpose', purpose));
        if (search) queries.push(Query.search('message', search));
        const response = await databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.MESSAGES, queries);
        return { success: true, data: response.documents, total: response.total };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteMessages(messageIds) {
    try {
        const promises = messageIds.map(id => databases.deleteDocument(APPWRITE_DATABASE_ID, COLLECTIONS.MESSAGES, id));
        await Promise.all(promises);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getAllUsers() {
    try {
        const response = await databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.USERS, [Query.limit(100)]);
        return { success: true, data: response.documents };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateUserStatus(userId, isActive) {
    try {
        const document = await databases.updateDocument(APPWRITE_DATABASE_ID, COLLECTIONS.USERS, userId, { isActive });
        return { success: true, data: document };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getStats() {
    try {
        const [messages, users] = await Promise.all([
            databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.MESSAGES, [Query.limit(1)]),
            databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.USERS, [Query.limit(1), Query.equal('isActive', true)])
        ]);
        return {
            success: true,
            data: {
                totalMessages: messages.total,
                totalFiles: 0,
                totalSubscribers: users.total,
                files: []
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getRegions() {
    try {
        const response = await databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.REGIONS, [Query.limit(100), Query.orderAsc('name')]);
        return { success: true, data: response.documents };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getUserProfile(userId) {
    try {
        const userDoc = await databases.getDocument(APPWRITE_DATABASE_ID, COLLECTIONS.USERS, userId);
        return { success: true, user: userDoc };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

const users = {
    updatePassword: async (userId, password) => {
        // This requires the users service which we'll initialize if needed
        // For now we'll use the server SDK
        const { Users } = require('node-appwrite');
        const usersService = new Users(client);
        return await usersService.updatePassword(userId, password);
    }
};

module.exports = {
    client, databases, account, storage, APPWRITE_DATABASE_ID, COLLECTIONS, Query, ID, corsHeaders, isConfigured, getConfigError,
    createUser, loginUser, getUserBySession, getMessages, deleteMessages, getAllUsers, updateUserStatus, getStats, getRegions, getUserProfile, users, functions
};
