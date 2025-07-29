import DOMPurify from 'dompurify';
import { z } from 'zod';

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return DOMPurify.sanitize(input.trim(), { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: []
  });
};

// Validation schemas with security constraints
export const secureStringSchema = z.string()
  .min(1, 'Field is required')
  .max(255, 'Input too long')
  .refine((val) => !/[<>\"'&]/.test(val), 'Invalid characters detected');

export const displayNameSchema = z.string()
  .min(1, 'Display name is required')
  .max(50, 'Display name must be 50 characters or less')
  .refine((val) => /^[a-zA-Z0-9\s\-_.]+$/.test(val), 'Display name contains invalid characters');

export const addressSchema = z.string()
  .min(1, 'Address is required')
  .max(200, 'Address too long')
  .refine((val) => !/[<>\"'`]/.test(val), 'Address contains invalid characters');

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email too long');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine((val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(val), 
    'Password must contain at least one uppercase letter, one lowercase letter, and one number');

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }
  
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

// Security logging
export const logSecurityEvent = async (
  event: string,
  details: Record<string, any>,
  userId?: string
) => {
  try {
    const securityLog = {
      timestamp: new Date().toISOString(),
      event,
      userId,
      userAgent: navigator?.userAgent || 'unknown',
      url: window?.location?.href || 'unknown',
      ...details
    };
    
    console.warn(`Security Event: ${event}`, securityLog);
    
    // Store security events locally for review
    const existingLogs = JSON.parse(localStorage.getItem('security-logs') || '[]');
    existingLogs.push(securityLog);
    
    // Keep only last 100 logs
    if (existingLogs.length > 100) {
      existingLogs.splice(0, existingLogs.length - 100);
    }
    
    localStorage.setItem('security-logs', JSON.stringify(existingLogs));
    
    // In production, you might want to send this to a logging service
    // await fetch('/api/security-log', { 
    //   method: 'POST', 
    //   body: JSON.stringify(securityLog) 
    // });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};