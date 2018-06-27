import { djedi } from "../src";

import {
  fetch,
  resetAll,
  simpleNodeResponse,
  wait,
  waitForPromises,
} from "./helpers";

jest.useFakeTimers();

beforeEach(() => {
  resetAll();
});

describe("get", () => {
  test("it works", done => {
    fetch(simpleNodeResponse("test", "test"));
    djedi.get({ uri: "test", value: "default" }, node => {
      expect(node).toMatchSnapshot();
      done();
    });
  });

  test("it handles error status codes", done => {
    fetch("<h1>Server error 500</h1>", { status: 500, stringify: false });
    djedi.get({ uri: "test", value: "default" }, node => {
      expect(node).toMatchSnapshot();
      done();
    });
  });

  test("it handles rejected requests", done => {
    fetch(new Error("Network error"));
    djedi.get({ uri: "test", value: "default" }, node => {
      expect(node).toMatchSnapshot();
      done();
    });
  });

  test("it handles missing node in response", done => {
    fetch({});
    djedi.get({ uri: "test", value: "default" }, node => {
      expect(node).toMatchSnapshot();
      done();
    });
  });

  test("it handles invalid JSON", done => {
    fetch('{ "invalid": true', { status: 200, stringify: false });
    djedi.get({ uri: "test", value: "default" }, node => {
      expect(node).toMatchSnapshot();
      done();
    });
  });

  test("it calls the callback synchronously if the node already exists", () => {
    djedi.addNodes(simpleNodeResponse("test", "test"));
    let called = false;
    djedi.get({ uri: "test", value: "default" }, node => {
      expect(node).toMatchSnapshot();
      called = true;
    });
    expect(called).toBe(true);
  });
});

describe("getBatched", () => {
  test("it works", async () => {
    fetch({
      ...simpleNodeResponse("1", "1"),
      ...simpleNodeResponse("2", "2"),
    });
    fetch(simpleNodeResponse("3", "3"));

    djedi.options.batchInterval = 30;

    const callback = jest.fn();

    djedi.getBatched({ uri: "1", value: undefined }, callback);
    djedi.getBatched({ uri: "1.txt", value: undefined }, callback);
    jest.advanceTimersByTime(10);
    djedi.getBatched({ uri: "en-us@1", value: undefined }, callback);
    jest.advanceTimersByTime(10);
    djedi.getBatched({ uri: "2", value: undefined }, callback);
    jest.advanceTimersByTime(10);
    djedi.getBatched({ uri: "3", value: undefined }, callback);

    await wait();
    expect(fetch.mockFn.mock.calls).toMatchSnapshot(
      "api calls (one request for 1 & 2, one for 3)"
    );
    expect(callback.mock.calls).toMatchSnapshot("callback calls");
  });

  test("it uses no timeout if batchInterval=0", async () => {
    fetch(simpleNodeResponse("test", "test"));
    djedi.options.batchInterval = 0;
    const callback = jest.fn();
    djedi.getBatched({ uri: "test", value: undefined }, callback);
    await waitForPromises();
    expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
    expect(callback.mock.calls).toMatchSnapshot("callback call");
  });

  test("it calls the callback synchronously if the node already exists", () => {
    djedi.addNodes(simpleNodeResponse("test", "test"));
    let called = false;
    djedi.getBatched({ uri: "test", value: "default" }, node => {
      expect(node).toMatchSnapshot();
      called = true;
    });
    expect(called).toBe(true);
  });
});

describe("reportRemovedNode", () => {
  test("it handles trying to remove a non-existing node", () => {
    expect(() => {
      djedi.reportRemovedNode("test");
    }).not.toThrow();
  });
});

// `addNodes` is tested together with `get` and `getBatched`.
// `resetNodes` and `resetOptions` are run in `beforeEach`.
