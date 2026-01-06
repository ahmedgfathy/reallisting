// Simple API configuration for SQLite backend
export const apiCall = async (url, options = {}) => {
  const API_BASE = 'http://localhost:5001';
  
  // Ensure URL starts with /api/
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  
  return fetch(fullUrl, options);
};

// Export for compatibility (not used with SQLite)
export const APPWRITE_PROJECT_ID = 'local-sqlite';
