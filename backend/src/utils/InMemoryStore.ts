/**
 * In-memory store implementation that mimics Redis API
 * Used as fallback when Redis is not available
 */
export class InMemoryStore {
  private store: Map<string, string> = new Map();

  /**
   * Set a key-value pair
   */
  async set(key: string, value: string): Promise<string | null> {
    this.store.set(key, value);
    return 'OK';
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  /**
   * Get all keys matching pattern (simplified implementation)
   */
  async keys(pattern: string): Promise<string[]> {
    const keys = Array.from(this.store.keys());
    if (pattern === '*') {
      return keys;
    }
    // Simple pattern matching for basic wildcards
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  /**
   * Clear all data (for testing/cleanup)
   */
  async flushall(): Promise<void> {
    this.store.clear();
  }

  /**
   * Get store size
   */
  size(): number {
    return this.store.size;
  }
}
