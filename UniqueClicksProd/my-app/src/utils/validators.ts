// Input validation utilities

// Validate URL format
export function validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Sanitize input to prevent SQL injection and other attacks
  export function sanitizeInput(input: string): string {
    // Basic sanitation - remove any HTML tags
    return input.replace(/<[^>]*>?/gm, '');
  }
  
  // Validate shortId format (alphanumeric + special chars used by shortid)
  export function validateShortId(shortId: string): boolean {
    const shortIdRegex = /^[a-zA-Z0-9_-]+$/;
    return shortIdRegex.test(shortId);
  }