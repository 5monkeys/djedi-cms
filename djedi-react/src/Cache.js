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

    const needsRefresh = Date.now() - item.timestamp > this.ttl;

    return { node: item.value, needsRefresh };
  }

  set(key, value) {
    this._cache.set(key, { timestamp: Date.now(), value });
  }

  delete(key) {
    this._cache.delete(key);
  }
}
