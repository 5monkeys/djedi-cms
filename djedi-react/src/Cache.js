export default class Cache {
  constructor({ ttl }) {
    this.ttl = ttl;
    this._cache = new Map();
  }

  get(key) {
    const item = this._cache.get(key);

    if (item == null) {
      return undefined;
    }

    if (Date.now() - item.timestamp > this.ttl) {
      this._cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  set(key, value) {
    this._cache.set(key, { timestamp: Date.now(), value });
  }
}
