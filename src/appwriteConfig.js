import { Client, Account, Databases, Storage, Functions, Query, ID } from 'appwrite';

// Appwrite Configuration
const APPWRITE_ENDPOINT = process.env.REACT_APP_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.REACT_APP_APPWRITE_PROJECT_ID || '694ba83300116af11b75';
const APPWRITE_DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || '695a84140031c5a93745';

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

// Universal API caller that works for both local dev and production Appwrite Functions
export const apiCall = async (url, options = {}) => {
  // 1. If it's an /api/ call, use Appwrite Functions SDK directly to bypass static routing issues
  if (url.startsWith('/api/')) {
    try {
      const parts = url.split('?');
      const pathParts = parts[0].split('/');
      const functionId = pathParts[2]; // e.g. "messages" from "/api/messages"

      // Reconstruct path for internal routing (e.g. /messages)
      const internalPath = url.includes('?') ? url.replace('/api/', '/') : parts[0].replace('/api/', '/');

      // Map method for SDK
      const method = options.method || 'GET';
      const body = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : '';

      // Execute function
      const execution = await functions.createExecution(
        functionId,
        body,
        false,
        internalPath,
        method,
        {
          ...options.headers,
          'Content-Type': 'application/json'
        }
      );

      // Reconstruct a fetch-like response object
      return {
        ok: execution.status === 'completed' && execution.statusCode >= 200 && execution.statusCode < 300,
        status: execution.statusCode,
        json: async () => {
          try {
            return JSON.parse(execution.responseBody);
          } catch (e) {
            console.error('Failed to parse response body as JSON:', execution.responseBody);
            return { error: 'Invalid JSON response from function', body: execution.responseBody };
          }
        },
        text: async () => execution.responseBody,
        headers: {
          get: (name) => {
            if (name.toLowerCase() === 'content-type') return 'application/json';
            return null;
          }
        }
      };
    } catch (err) {
      console.error('Appwrite Function execution failed:', err);
      // Fallback to fetch if SDK fails unexpectedly
    }
  }

  // 2. Default to standard fetch for non-API calls or as final fallback
  return fetch(url, options);
};

// Collection IDs
export const COLLECTIONS = {
  USERS: 'users',
  MESSAGES: 'messages',
  REGIONS: 'regions'
};

export const DATABASE_ID = APPWRITE_DATABASE_ID;

// Authentication helpers
export const auth = {
  async login(mobile, password) {
    try {
      const response = await apiCall('/api/auth?path=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password })
      });
      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      return { error: error.message };
    }
  },

  async register(mobile, password, name = '') {
    try {
      const response = await apiCall('/api/auth?path=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password, name })
      });
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  },

  async verify() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { authenticated: false };

      const response = await apiCall('/api/auth?path=verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    } catch (error) {
      return { authenticated: false, error: error.message };
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// Messages API
export const messagesAPI = {
  async getAll(filters = {}) {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      // Only append non-'الكل' filters
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'الكل') params.append(k, v);
      });
      const response = await apiCall(`/api/messages?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }
};

// Admin API
export const adminAPI = {
  async getUsers() {
    try {
      const token = localStorage.getItem('token');
      const response = await apiCall('/api/admin?path=users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  },

  async updateUserStatus(userId, isActive) {
    try {
      const token = localStorage.getItem('token');
      const response = await apiCall(`/api/admin/${userId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      });
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  },

  async deleteMessages(ids) {
    try {
      const token = localStorage.getItem('token');
      const response = await apiCall('/api/messages-delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids })
      });
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }
};

// Stats API
export const statsAPI = {
  async get() {
    try {
      const response = await apiCall('/api/stats');
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }
};

// Regions API
export const regionsAPI = {
  async getAll() {
    try {
      const response = await apiCall('/api/regions');
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }
};

export { Query, ID };
export default client;
