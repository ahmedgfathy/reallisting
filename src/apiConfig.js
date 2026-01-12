// API configuration for Supabase backend
export const apiCall = async (url, options = {}) => {
  // In production, use relative URLs (same domain)
  // In development, use localhost:5001
  const API_BASE = process.env.NODE_ENV === 'production' 
    ? window.location.origin 
    : 'http://localhost:5001';
  
  // Ensure URL starts with /api/
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  
  return fetch(fullUrl, options);
};

