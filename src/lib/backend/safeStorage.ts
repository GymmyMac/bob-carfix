/**
 * Safe storage utility that gracefully handles blocked localStorage/sessionStorage
 * in iframe contexts (like Lovable preview)
 */

// In-memory fallback storage
class MemoryStorage implements Storage {
  private data: Map<string, string> = new Map();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function testStorage(storage: Storage): boolean {
  try {
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export type StorageType = 'localStorage' | 'sessionStorage' | 'memory';

let cachedStorage: Storage | null = null;
let cachedStorageType: StorageType | null = null;

export function getSafeStorage(): { storage: Storage; type: StorageType } {
  if (cachedStorage && cachedStorageType) {
    return { storage: cachedStorage, type: cachedStorageType };
  }

  // Try localStorage first
  try {
    if (typeof window !== 'undefined' && window.localStorage && testStorage(window.localStorage)) {
      cachedStorage = window.localStorage;
      cachedStorageType = 'localStorage';
      return { storage: cachedStorage, type: cachedStorageType };
    }
  } catch {
    // localStorage blocked or unavailable
  }

  // Try sessionStorage as fallback
  try {
    if (typeof window !== 'undefined' && window.sessionStorage && testStorage(window.sessionStorage)) {
      cachedStorage = window.sessionStorage;
      cachedStorageType = 'sessionStorage';
      console.info('[SafeStorage] Using sessionStorage fallback');
      return { storage: cachedStorage, type: cachedStorageType };
    }
  } catch {
    // sessionStorage blocked or unavailable
  }

  // Final fallback: in-memory storage
  cachedStorage = new MemoryStorage();
  cachedStorageType = 'memory';
  console.info('[SafeStorage] Using in-memory storage fallback');
  return { storage: cachedStorage, type: cachedStorageType };
}

export function getStorageType(): StorageType {
  if (!cachedStorageType) {
    getSafeStorage();
  }
  return cachedStorageType!;
}
