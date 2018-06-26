import unfetch from "isomorphic-unfetch";

import { djedi } from "../src";

class Response {
  constructor({ status, body }) {
    this.bodyUsed = false;
    this.status = status;
    this.statusText = "<mock.statusText>";
    this._body = body;
  }

  async json() {
    return this._consumeBody(JSON.parse(this._body));
  }

  async text() {
    return this._consumeBody(String(this._body));
  }

  async _consumeBody(body) {
    if (this.bodyUsed) {
      throw new TypeError("Body has already been consumed.");
    }
    this.bodyUsed = true;
    return body;
  }
}

// Mock `fetch` (unfetch) responses. Can be called several times to mock the
// first, second, third, etc. call.
export function fetch(value, { status = 200, stringify = true } = {}) {
  unfetch.mockImplementationOnce(() => {
    if (value instanceof Error) {
      return Promise.reject(value);
    }

    const response = new Response({
      status,
      body: stringify ? JSON.stringify(value) : value,
    });
    return Promise.resolve(response);
  });
}

fetch.reset = () => {
  unfetch.mockClear();
};

fetch.mockFn = unfetch;

// Wait for `setTimeout` and (mocked) `Promise`s.
export function wait() {
  jest.runAllTimers();
  return new Promise(resolve => {
    setImmediate(resolve);
  });
}

// Useful in `beforeEach`.
export function resetAll() {
  djedi.resetOptions();
  djedi.resetNodes();
  fetch.reset();
}
