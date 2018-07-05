import LRU from "lru-cache";

import { djedi } from "../src";

import {
  errorDetails,
  fetch,
  resetAll,
  simpleNodeResponse,
  wait,
  waitForPromises,
} from "./helpers";

jest.useFakeTimers();

console.warn = jest.fn();
console.error = jest.fn();
jest.spyOn(Date, "now");

beforeEach(() => {
  resetAll();
  console.warn.mockReset();
  console.error.mockReset();
  Date.now.mockReset();
  document.body.textContent = "";
  document.domain = "site.example.com";
});

// `addNodes` is tested together with `get` and `getBatched`.
// `reportPrefetchableNode` is tested together with `prefetch`.
// `resetState` and `resetOptions` are run in `beforeEach`.

describe("get", () => {
  test("it works", done => {
    fetch(simpleNodeResponse("test", "test"));
    djedi.get({ uri: "test", value: "default" }, node => {
      expect(node).toMatchSnapshot();
      done();
    });
  });

  test("it handles missing node in response", done => {
    fetch({});
    djedi.get({ uri: "test", value: "default" }, node => {
      expect(errorDetails(node)).toMatchSnapshot();
      done();
    });
  });

  getTests(djedi.get.bind(djedi));

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

  test("it handles missing node in response", async () => {
    fetch(simpleNodeResponse("test", "test"));
    const callback = jest.fn();
    djedi.getBatched({ uri: "test", value: "default" }, callback);
    djedi.getBatched({ uri: "missing", value: "default" }, callback);
    await wait();
    expect(callback.mock.calls).toMatchSnapshot();
  });

  getTests(djedi.getBatched.bind(djedi));

  networkTests(callback => {
    djedi.getBatched({ uri: "test", value: "default" }, callback);
  });
});

describe("reportPrefetchableNode", () => {
  test("it warns about reporting nodes with different defaults", async () => {
    fetch({});
    djedi.reportPrefetchableNode({ uri: "test", value: "default" });
    djedi.reportPrefetchableNode({
      uri: "en-us@test",
      value: "other default",
    });
    djedi.reportPrefetchableNode({
      uri: "i18n://test.txt",
      value: undefined,
    });
    expect(console.warn.mock.calls).toMatchSnapshot("console.warn");
    await djedi.prefetch();
    expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
  });
});

describe("prefetch", () => {
  test("it works", async () => {
    fetch({
      ...simpleNodeResponse("test", "test"),
      ...simpleNodeResponse("other", "other"),
    });
    const spy = jest.spyOn(djedi, "addNodes");
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    djedi.reportPrefetchableNode({ uri: "other", value: "default" });
    const nodes = await djedi.prefetch();
    expect(nodes).toMatchSnapshot("nodes");
    expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
    expect(spy.mock.calls).toMatchSnapshot("addNodes call");
    spy.mockReset();
    spy.mockRestore();
  });

  test("it allows filtering nodes", async () => {
    fetch({
      ...simpleNodeResponse("test", "test"),
    });
    const filter = jest.fn(uri => uri.path.startsWith("test"));
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    djedi.reportPrefetchableNode({ uri: "other", value: "default" });
    const nodes = await djedi.prefetch({ filter });
    expect(nodes).toMatchSnapshot("nodes");
    expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
    expect(filter.mock.calls).toMatchSnapshot("filter calls");
  });

  test("it allows passing extra nodes", async () => {
    fetch({
      ...simpleNodeResponse("test", "test"),
      ...simpleNodeResponse("other", "other"),
      ...simpleNodeResponse("extra", "extra"),
    });
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    djedi.reportPrefetchableNode({ uri: "other", value: "default" });
    const nodes = await djedi.prefetch({
      extra: [
        { uri: "test.txt", value: undefined },
        { uri: "extra", value: "extra" },
      ],
    });
    expect(nodes).toMatchSnapshot("nodes");
    expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
  });

  test("it does not filter the extra nodes", async () => {
    fetch({
      ...simpleNodeResponse("test", "test"),
      ...simpleNodeResponse("extra", "extra"),
    });
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    djedi.reportPrefetchableNode({ uri: "other", value: "default" });
    const nodes = await djedi.prefetch({
      filter: () => false,
      extra: [
        { uri: "test.txt", value: undefined },
        { uri: "extra", value: "extra" },
      ],
    });
    expect(nodes).toMatchSnapshot("nodes");
    expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
  });

  test("it makes no request if there are no nodes to prefetch", async () => {
    const nodes1 = await djedi.prefetch();
    expect(nodes1).toEqual({});

    djedi.addNodes({ existing: "default" });
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    const nodes2 = await djedi.prefetch({
      filter: () => false,
      extra: [{ uri: "existing.txt", value: "default" }],
    });
    expect(nodes2).toEqual({});

    expect(fetch.mockFn).toHaveBeenCalledTimes(0);
  });

  test('it "returns" all "rendered" nodes even if no request', async () => {
    fetch({
      ...simpleNodeResponse("1", "1"),
      ...simpleNodeResponse("2", "2"),
    });

    djedi.reportPrefetchableNode({ uri: "1", value: undefined });
    djedi.reportPrefetchableNode({ uri: "2", value: undefined });

    const nodes1 = await djedi.prefetch();
    expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");

    const nodes2 = await djedi.prefetch();
    const callback = jest.fn();
    djedi.get({ uri: "1", value: undefined }, callback);
    djedi.getBatched({ uri: "2", value: undefined }, callback);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(nodes2).toEqual(nodes1);
  });

  test("it refetches if cache has expired", async () => {
    const ttl = 10e3;
    await prefetchRefetchTest(ttl, ttl);
  });

  test("it refetches if custom cache has expired", async () => {
    const ttl = 10e3;
    await prefetchRefetchTest(ttl, new LRU({ maxAge: ttl }));
  });

  networkTests(callback => {
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    djedi.prefetch().then(callback, callback);
  });
});

describe("injectAdmin", () => {
  test("it works", async () => {
    fetch("<iframe></iframe>", { stringify: false });
    document.body.innerHTML = "<p>Some content</p>";
    const inserted = await djedi.injectAdmin();
    expect(inserted).toBe(true);
    expect(document.body.innerHTML).toMatchSnapshot();
    expect(document.domain).toBe("site.example.com");
  });

  test("it sets document.domain", async () => {
    fetch(
      '<script>document.domain = "example.com";</script><iframe></iframe>',
      { stringify: false }
    );
    document.body.innerHTML = "<p>Some content</p>";
    const inserted = await djedi.injectAdmin();
    expect(inserted).toBe(true);
    expect(document.body.innerHTML).toMatchSnapshot();
    expect(document.domain).toBe("example.com");
  });

  test("handles not having permission", async () => {
    fetch("<h1>403 Forbidden</h1>", { status: 403, stringify: false });
    document.body.innerHTML = "<p>Some content</p>";
    const inserted = await djedi.injectAdmin();
    expect(inserted).toBe(false);
    expect(document.body.innerHTML).toMatchSnapshot();
  });

  test("it handles error status codes", async () => {
    fetch("<h1>Server error 500</h1>", { status: 500, stringify: false });
    await expect(djedi.injectAdmin()).rejects.toThrowErrorMatchingSnapshot();
  });

  test("it handles rejected requests", async () => {
    fetch(new Error("Network error"));
    await expect(djedi.injectAdmin()).rejects.toThrowErrorMatchingSnapshot();
  });

  test("it respects options.baseUrl", async () => {
    fetch("", { stringify: false });
    djedi.options.baseUrl = "https://example.com/cms";
    await djedi.injectAdmin();
    expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
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

  test("they handle an already present window.DJEDI_NODES", () => {
    window.DJEDI_NODES = simpleNodeResponse("already", "existing");
    expect(window.DJEDI_NODES).toMatchSnapshot();

    djedi.constructor();
    djedi.reportRenderedNode({ uri: "test", value: "test" });
    expect(window.DJEDI_NODES).toMatchSnapshot();

    djedi.reportRemovedNode("test");
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

describe("setCache", () => {
  test("it works", async () => {
    fetch(simpleNodeResponse("test", "test"));

    const start = new Date("2018-01-01").getTime();
    const end = new Date("2118-01-01").getTime();

    Date.now.mockReturnValue(start);
    djedi.addNodes(simpleNodeResponse("test", "test"));

    // We just added the node so it hasn't expired and the callback is called
    // immediately.
    const callback1 = jest.fn();
    djedi.get({ uri: "test", value: "test" }, callback1);
    expect(callback1).toHaveBeenCalledTimes(1);

    // The default (browser) ttl is very long.
    const callback2 = jest.fn();
    Date.now.mockReturnValue(end);
    djedi.get({ uri: "test", value: "test" }, callback2);
    expect(callback2).toHaveBeenCalledTimes(1);

    // Set a short ttl and let it expire.
    const callback3 = jest.fn();
    const ttl = 60e3;
    djedi.setCache(ttl);
    Date.now.mockReturnValue(start + ttl);
    djedi.get({ uri: "test", value: "test" }, callback3);
    expect(callback3).toHaveBeenCalledTimes(1);
    Date.now.mockReturnValue(start + ttl + 1);
    djedi.get({ uri: "test", value: "test" }, callback3);
    expect(callback3).toHaveBeenCalledTimes(1);
    await wait();
    expect(callback3).toHaveBeenCalledTimes(2);
  });

  test("it allows setting a custom cache", async () => {
    fetch(simpleNodeResponse("1", "1"));
    fetch(simpleNodeResponse("1", "1"));

    const start = new Date("2018-01-01").getTime();

    const text1 = "text1";
    const text2 = "some longer text";
    const text3 = "the third and final text";

    const ttl = 10e3;
    djedi.setCache(
      new LRU({
        maxAge: ttl,
        max: text2.length + text3.length,
        length: node => node.value.length,
      })
    );

    Date.now.mockReturnValue(start);
    djedi.addNodes({
      "1": text1,
      "2": text2,
    });

    // We just added the nodes so they haven't expired and the callback is
    // called immediately.
    const callback1 = jest.fn();
    djedi.get({ uri: "1", value: undefined }, callback1);
    expect(callback1).toHaveBeenCalledTimes(1);

    // Let the nodes expire because of age.
    const callback2 = jest.fn();
    Date.now.mockReturnValue(start + ttl + 1);
    djedi.get({ uri: "1", value: undefined }, callback2);
    expect(callback2).toHaveBeenCalledTimes(0);
    await wait();
    expect(callback2).toHaveBeenCalledTimes(1);

    // Let the oldest node be removed because of size.
    Date.now.mockReturnValue(start);
    djedi.addNodes({
      "1": text1,
      "2": text2,
    });
    const callback3 = jest.fn();
    djedi.get({ uri: "1", value: undefined }, callback3);
    expect(callback3).toHaveBeenCalledTimes(1);
    Date.now.mockReturnValue(start + 10);
    djedi.get({ uri: "2", value: undefined }, callback3);
    expect(callback3).toHaveBeenCalledTimes(2);
    djedi.addNodes({ "3": text3 });
    djedi.get({ uri: "3", value: undefined }, callback3);
    expect(callback3).toHaveBeenCalledTimes(3);
    djedi.get({ uri: "1", value: undefined }, callback3);
    expect(callback3).toHaveBeenCalledTimes(3);
    await wait();
    expect(callback3).toHaveBeenCalledTimes(4);
  });

  test("it handles switching to a custom cache and back again", () => {
    class FakeCache {
      get() {
        throw new Error("Expected FakeCache#get not to have been called");
      }

      set() {
        throw new Error("Expected FakeCache#set not to have been called");
      }
    }

    djedi.setCache(new FakeCache());
    djedi.setCache(10e3);
    expect(() => {
      djedi.addNodes(simpleNodeResponse("test", "test"));
    }).not.toThrow();
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

// Tests in common for `djedi.get` and `djedi.getBatched`.
function getTests(fn) {
  test("it handles auto-versioning", done => {
    fetch({ "i18n://en-us@test.txt#1": "user edited text" });
    fn({ uri: "test", value: "default" }, node => {
      expect(node).toMatchSnapshot();
      done();
    });
    jest.runAllTimers();
  });

  test("it calls the callback synchronously if the node already exists", () => {
    djedi.addNodes({
      ...simpleNodeResponse("test", "test"),
      "i18n://en-us@edited.txt#1": "user edited text",
    });

    let called = false;
    fn({ uri: "test", value: "default" }, node => {
      expect(node).toMatchSnapshot("simple");
      called = true;
    });
    expect(called).toBe(true);

    called = false;
    fn({ uri: "edited", value: "default" }, node => {
      expect(node).toMatchSnapshot("versionless");
      called = true;
    });
    expect(called).toBe(true);

    called = false;
    fn({ uri: "edited#1", value: "default" }, node => {
      expect(node).toMatchSnapshot("versioned");
      called = true;
    });
    expect(called).toBe(true);
  });

  test("it does not update versionless nodes", async () => {
    fetch(simpleNodeResponse("test", "default"));
    fetch({ "i18n://en-us@test.txt#1": "edited" });

    fn({ uri: "test", value: undefined }, node => {
      expect(node).toMatchSnapshot("versionless");
    });

    await wait();

    fn({ uri: "test#1", value: undefined }, node => {
      expect(node).toMatchSnapshot("versioned");
    });

    await wait();

    let called = false;
    fn({ uri: "test", value: undefined }, node => {
      expect(node).toMatchSnapshot("versionless unchanged");
      called = true;
    });
    expect(called).toBe(true);
  });
}

function networkTests(fn) {
  test("it handles error status codes", async done => {
    fetch("<h1>Server error 500</h1>", { status: 500, stringify: false });
    fn(result => {
      expect(errorDetails(result)).toMatchSnapshot();
      done();
    });
    await wait();
  });

  test("it handles rejected requests", async done => {
    fetch(new Error("Network error"));
    fn(result => {
      expect(errorDetails(result)).toMatchSnapshot();
      done();
    });
    await wait();
  });

  test("it handles invalid JSON", async done => {
    fetch('{ "invalid": true', { status: 200, stringify: false });
    fn(result => {
      expect(errorDetails(result)).toMatchSnapshot();
      done();
    });
    await wait();
  });

  test("it respects options.baseUrl", async () => {
    fetch({});
    djedi.options.baseUrl = "https://example.com/cms";
    const callback = jest.fn();
    fn(callback);
    await wait();
    expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
    expect(callback).toHaveBeenCalledTimes(1);
  });
}

async function prefetchRefetchTest(ttl, cacheValue) {
  fetch(simpleNodeResponse("test", "test"));

  const start = new Date("2018-01-01").getTime();
  djedi.setCache(cacheValue);

  Date.now.mockReturnValue(start);
  djedi.addNodes(simpleNodeResponse("test", "test"));
  djedi.reportPrefetchableNode({ uri: "test", value: undefined });

  await djedi.prefetch();
  expect(fetch.mockFn).toHaveBeenCalledTimes(0);

  Date.now.mockReturnValue(start + ttl + 1);
  await djedi.prefetch();
  expect(fetch.mockFn).toHaveBeenCalledTimes(1);

  const callback = jest.fn();
  djedi.get({ uri: "test", value: undefined }, callback);
  expect(callback.mock.calls).toMatchSnapshot();
}
