import React from "react";
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

export function simpleNodeResponse(path, value) {
  return { [`i18n://en-us@${path}.txt`]: value };
}

// Wait for `setTimeout` and (mocked) `Promise`s.
export function wait() {
  jest.runAllTimers();
  return waitForPromises();
}

// Wait for (mocked) `Promise`s.
export function waitForPromises() {
  return new Promise(resolve => {
    setImmediate(resolve);
  });
}

// Useful in `beforeEach`.
export function resetAll() {
  djedi.resetOptions();
  djedi.resetState();
  fetch.reset();
}

/*
Returns a wrapper component that makes it easy to change props of some other
component.

    const Wrapper = withState(({ name = "Alice" }) => (
      <SomeComponent name={name} />
    ));
    const component = renderer.create(<Wrapper />);
    const instance = component.getInstance();
    expect(component.toJSON()).toMatchSnapshot("first render");
    instance.setState({ name: "Bob" });
    expect(component.toJSON()).toMatchSnapshot("second render");
*/
export function withState(render) {
  return class extends React.Component {
    render() {
      return render(this.state || {});
    }
  };
}

export function errorDetails(error) {
  return {
    message: error.message,
    status: error.status,
    responseText: error.responseText,
  };
}
