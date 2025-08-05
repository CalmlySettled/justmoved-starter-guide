// No-op toast function to replace all toast notifications as requested by the user
export const toast = (...args: any[]) => {
  // All toast notifications have been disabled per user request
  // Original toast calls are commented out throughout the codebase
};

// Utility functions to replace toast notifications with console logs
export const logError = (title: string, description?: string) => {
  console.error(`${title}: ${description || ''}`);
};

export const logSuccess = (title: string, description?: string) => {
  console.log(`✅ ${title}: ${description || ''}`);
};

export const logInfo = (title: string, description?: string) => {
  console.info(`ℹ️ ${title}: ${description || ''}`);
};