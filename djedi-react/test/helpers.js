import React from "react";

import { djedi } from "../src";

class Response {
  constructor({ status, body, contentType }) {
    this.bodyUsed = false;
    this.status = status;
    this.statusText = "<mock.statusText>";
    this._body = body;
    this._contentType = contentType;

    this.headers = {
      get: name => {
        switch (name.toLowerCase()) {
          case "content-type":
            return this._contentType;
          default:
            return undefined;
        }
      },
    };
  }

  async json() {
    return JSON.parse(this._consumeBody());
  }

  async text() {
    return String(this._consumeBody());
  }

  _consumeBody() {
    if (this.bodyUsed) {
      throw new TypeError("Body has already been consumed.");
    }
    this.bodyUsed = true;
    return this._body;
  }
}

// Mock `fetch` responses. Can be called several times to mock the first,
// second, third, etc. call.
export function fetch(
  value,
  {
    status = 200,
    stringify = true,
    contentType = typeof value === "string" ? "text/html" : "application/json",
  } = {}
) {
  fetch.mockFn.mockImplementationOnce(() => {
    if (value instanceof Error) {
      return Promise.reject(value);
    }

    const response = new Response({
      status,
      body: stringify ? JSON.stringify(value) : value,
      contentType,
    });
    return Promise.resolve(response);
  });
}

fetch.reset = () => {
  fetch.mockFn.mockReset();
  fetch.mockFn.mockImplementation(() =>
    Promise.resolve(
      new Response({
        status: 200,
        body: JSON.stringify({}),
        contentType: "application/json",
      })
    )
  );
};

fetch.mockFn = jest.fn();

// A shorter version of `fetch.mockFn.mock.calls`, for shorter inline snapshots.
// We don't need to assert the URL and headers every time. For most tests only
// the body is interesting.
fetch.calls = () => {
  const calls = fetch.mockFn.mock.calls.map(args => args[1].body);
  return calls.length === 1 ? calls[0] : calls;
};

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
  djedi.options.fetch = fetch.mockFn;
}

/*
Returns a wrapper component that makes it easy to change props of some other
component.

    const Wrapper = withState(({ name = "Alice" }) => (
      <SomeComponent name={name} />
    ));
    const component = renderer.create(<Wrapper />);
    const instance = component.getInstance();
    expect(component.toJSON()).toMatchInlineSnapshot();
    instance.setState({ name: "Bob" });
    expect(component.toJSON()).toMatchInlineSnapshot();
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
    ...(error.response != null
      ? {
          status: error.response.status,
          __input: error.response.__input,
          __output: error.response.__output,
        }
      : {}),
  };
}
