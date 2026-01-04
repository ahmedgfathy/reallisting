import { Client, Account, Databases, Storage, Query, ID } from 'appwrite';

// Appwrite Configuration
const APPWRITE_ENDPOINT = process.env.REACT_APP_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.REACT_APP_APPWRITE_PROJECT_ID || '694ba83300116af11b75';
const APPWRITE_DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || 'reallisting';

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Collection IDs
export const COLLECTIONS = {
  USERS: 'users',
  MESSAGES: 'messages',
  REGIONS: 'regions'
};

export const DATABASE_ID = APPWRITE_DATABASE_ID;

// Helper functions for frontend
export const appwriteConfig = {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  databaseId: APPWRITE_DATABASE_ID
};

// Authentication helpers (using API endpoints for consistency)
export const auth = {
  async login(mobile, password) {
    try {
      const response = await fetch('/api/auth/login', {
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
      const response = await fetch('/api/auth/register', {
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

      const response = await fetch('/api/auth/verify', {
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
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/messages?${params}`, {
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
      const response = await fetch('/api/admin/users', {
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
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: isActive })
      });
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  },

  async deleteUser(userId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
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
      const response = await fetch('/api/stats');
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
      const response = await fetch('/api/regions');
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }
};

export { Query, ID };
export default client;
