// API configuration for Supabase backend
export const apiCall = async (url, options = {}) => {
  // Use relative URLs in production, localhost in development
  const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001';
  
  // Ensure URL starts with /api/
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  
  return fetch(fullUrl, options);
};

