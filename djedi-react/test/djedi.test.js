import { djedi } from "../src";

import {
  fetch,
  resetAll,
  simpleNodeResponse,
  wait,
  waitForPromises,
} from "./helpers";

jest.useFakeTimers();

console.warn = jest.fn();
console.error = jest.fn();

beforeEach(() => {
  resetAll();
  console.warn.mockClear();
  console.error.mockClear();
});

// `addNodes` is tested together with `get` and `getBatched`.
// `resetNodes` and `resetOptions` are run in `beforeEach`.

describe("get", () => {
  test("it works", done => {
    fetch(simpleNodeResponse("test", "test"));
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

  test("it handles missing node in response", done => {
    fetch({});
    djedi.get({ uri: "test", value: "default" }, node => {
      expect(node).toMatchSnapshot();
      done();
    });
  });

  networkTests(callback => {
    djedi.get({ uri: "test", value: "default" }, callback);
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

  networkTests(callback => {
    djedi.getBatched({ uri: "test", value: "default" }, callback);
  });
});

describe("loadMany", () => {
  networkTests(callback => {
    djedi.loadMany({ test: "default" }).then(callback, callback);
  });
});

describe("loadByPrefix", () => {
  networkTests(callback => {
    djedi.loadByPrefix(["test/"]).then(callback, callback);
  });
});

describe("reportRenderedNode and reportRemovedNode", () => {
  test("they work", () => {
    expect(window.DJEDI_NODES).toMatchSnapshot();
    djedi.reportRenderedNode({ uri: "first", value: "first" });
    djedi.reportRenderedNode({ uri: "first", value: "first" });
    djedi.reportRenderedNode({ uri: "second", value: "second" });
    expect(window.DJEDI_NODES).toMatchSnapshot();
    djedi.reportRemovedNode("first");
    expect(window.DJEDI_NODES).toMatchSnapshot();
    djedi.reportRemovedNode("first");
    expect(window.DJEDI_NODES).toMatchSnapshot();
    djedi.reportRemovedNode("second");
    expect(window.DJEDI_NODES).toMatchSnapshot();
  });

  test("reportRenderedNode warns about rendering nodes with different defaults", () => {
    djedi.reportRenderedNode({ uri: "test", value: "default" });
    djedi.reportRenderedNode({ uri: "en-us@test", value: "other default" });
    djedi.reportRenderedNode({ uri: "i18n://test.txt", value: undefined });

    expect(console.warn.mock.calls).toMatchSnapshot("console.warn");
    expect(window.DJEDI_NODES).toMatchSnapshot("window.DJEDI_NODES");
  });

  test("reportRemovedNode handles trying to remove a non-existing node", () => {
    expect(() => {
      djedi.reportRemovedNode("test");
    }).not.toThrow();
  });
});

describe("element", () => {
  test("it works", () => {
    expect(djedi.element("test")).toMatchSnapshot();
    expect(djedi.element("i18n://sv-se@home/intro.md#5")).toMatchSnapshot();
  });
});

describe("options.uri", () => {
  test("it works", async () => {
    djedi.options.uri = {
      defaults: {
        scheme: "scheme",
        namespace: "namespace",
        path: "",
        ext: "ext",
        version: "version",
      },
      namespaceByScheme: {
        scheme2: "namespace2",
      },
      separators: {
        scheme: "<SCHEME>",
        namespace: "<NAMESPACE>",
        path: "<PATH>",
        ext: "<EXT>",
        version: "<VERSION>",
      },
    };

    djedi.addNodes({
      test: "text1",
      "test<EXT>md": "text2",
      "scheme2<SCHEME>test": "text3",
      "scheme2<SCHEME>namespace3<NAMESPACE>home<PATH>test<EXT>html<VERSION>5":
        "text4",
    });

    const callback = jest.fn();

    djedi.getBatched({ uri: "test", value: undefined }, callback);
    djedi.getBatched({ uri: "test<EXT>ext", value: undefined }, callback);

    djedi.getBatched({ uri: "test<EXT>md", value: undefined }, callback);
    djedi.getBatched(
      { uri: "scheme<SCHEME>test<EXT>md", value: undefined },
      callback
    );

    djedi.getBatched(
      { uri: "scheme2<SCHEME>test", value: undefined },
      callback
    );

    djedi.getBatched(
      {
        uri:
          "scheme2<SCHEME>namespace3<NAMESPACE>home<PATH>test<EXT>html<VERSION>5",
        value: undefined,
      },
      callback
    );

    expect(callback.mock.calls).toMatchSnapshot("callback calls");
  });
});

function networkTests(fn) {
  test("it handles error status codes", async done => {
    fetch("<h1>Server error 500</h1>", { status: 500, stringify: false });
    fn(result => {
      expect(result).toMatchSnapshot();
      done();
    });
    await wait();
  });

  test("it handles rejected requests", async done => {
    fetch(new Error("Network error"));
    fn(result => {
      expect(result).toMatchSnapshot();
      done();
    });
    await wait();
  });

  test("it handles invalid JSON", async done => {
    fetch('{ "invalid": true', { status: 200, stringify: false });
    fn(result => {
      expect(result).toMatchSnapshot();
      done();
    });
    await wait();
  });

  test("it respects options.baseUrl", async () => {
    fetch({});
    djedi.options.baseUrl = "http://example.com/interal";
    const callback = jest.fn();
    fn(callback);
    await wait();
    expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
    expect(callback).toHaveBeenCalledTimes(1);
  });
}
