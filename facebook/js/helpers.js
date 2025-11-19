// ==================== HELPER FUNCTIONS ====================

// Validate email format
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function validatePassword(password) {
  return {
    valid: password.length >= 6,
    errors: password.length < 6 ? ['Password must be at least 6 characters'] : []
  };
}

// Validate form data
export function validateForm(formData) {
  const errors = {};

  // Email validation
  if (!formData.email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(formData.email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation
  if (!formData.password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.errors.join(', ');
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

// Local storage helpers
export const storage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  },

  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
};

// Session storage helpers
export const sessionStorage = {
  set: (key, value) => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error saving to sessionStorage:', error);
      return false;
    }
  },

  get: (key, defaultValue = null) => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      window.sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from sessionStorage:', error);
      return false;
    }
  }
};

// Format number (1000 -> 1K)
export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Generate unique ID
export function generateUniqueId(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Deep clone object
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Check if object is empty
export function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

// Retry async function
export async function retryAsync(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Batch process array
export async function batchProcess(items, batchSize, processFn) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);
  }
  
  return results;
}

// Throttle function
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Get query parameters
export function getQueryParams() {
  const params = {};
  const queryString = window.location.search.substring(1);
  const pairs = queryString.split('&');
  
  pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  });
  
  return params;
}

// Set query parameter
export function setQueryParam(key, value) {
  const url = new URL(window.location);
  url.searchParams.set(key, value);
  window.history.pushState({}, '', url);
}

// Remove query parameter
export function removeQueryParam(key) {
  const url = new URL(window.location);
  url.searchParams.delete(key);
  window.history.pushState({}, '', url);
}

// Detect mobile device
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Get device type
export function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

// Download file
export function downloadFile(data, filename, type = 'text/plain') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Format file size
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Wait for condition
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

// Array utilities
export const arrayUtils = {
  unique: (arr) => [...new Set(arr)],
  shuffle: (arr) => arr.sort(() => Math.random() - 0.5),
  chunk: (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },
  groupBy: (arr, key) => {
    return arr.reduce((acc, item) => {
      const group = item[key];
      acc[group] = acc[group] || [];
      acc[group].push(item);
      return acc;
    }, {});
  }
};

// String utilities
export const stringUtils = {
  capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
  camelCase: (str) => str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : ''),
  kebabCase: (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
  truncate: (str, length, suffix = '...') => {
    return str.length > length ? str.substring(0, length) + suffix : str;
  },
  escapeHtml: (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

export default {
  validateEmail,
  validatePassword,
  validateForm,
  storage,
  sessionStorage,
  formatNumber,
  generateUniqueId,
  deepClone,
  isEmpty,
  retryAsync,
  batchProcess,
  throttle,
  getQueryParams,
  setQueryParam,
  removeQueryParam,
  isMobileDevice,
  getDeviceType,
  downloadFile,
  formatFileSize,
  waitFor,
  arrayUtils,
  stringUtils
};
