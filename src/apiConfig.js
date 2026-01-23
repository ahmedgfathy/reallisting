// API configuration for MySQL/MariaDB backend
export const apiCall = async (url, options = {}) => {
  // Priority: REACT_APP_API_URL > same domain > localhost
  let API_BASE = process.env.REACT_APP_API_URL 
    || (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5001');
  
  // Remove trailing slash from API_BASE to prevent double slashes
  API_BASE = API_BASE.replace(/\/$/, '');
  
  // Ensure URL starts with /api/
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  
  return fetch(fullUrl, options);
};

