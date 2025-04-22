// Cache implementation for URL shortener

export class URLCache {
    private cache: Map<string, any>;
    private maxSize: number;
    private ttl: number; // Time to live in milliseconds
  
    constructor(maxSize = 1000, ttlMinutes = 15) {
      this.cache = new Map();
      this.maxSize = maxSize;
      this.ttl = ttlMinutes * 60 * 1000;
    }
  
    get(key: string): any {
      const item = this.cache.get(key);
      if (!item) return null;
      
      // Check if the item has expired
      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        return null;
      }
      
      // Move to the end to mark as recently used
      this.cache.delete(key);
      this.cache.set(key, item);
      return item.value;
    }
  
    set(key: string, value: any): void {
      // Implement LRU eviction if cache is full
      if (this.cache.size >= this.maxSize) {
        // Remove the oldest item (first item in the map)
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
            this.cache.delete(firstKey);
        }
      }
      
      this.cache.set(key, {
        value,
        expiry: Date.now() + this.ttl
      });
    }
  
    invalidate(key: string): void {
      this.cache.delete(key);
    }
    
    clear(): void {
      this.cache.clear();
    }
  }
  
  // Create and export singleton instance
  export const urlCache = new URLCache();