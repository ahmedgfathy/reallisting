// API configuration for Supabase backend
export const apiCall = async (url, options = {}) => {
  // Priority: REACT_APP_API_URL > same domain > localhost
  const API_BASE = process.env.REACT_APP_API_URL 
    || (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5001');
  
  // Ensure URL starts with /api/
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  
  return fetch(fullUrl, options);
};

