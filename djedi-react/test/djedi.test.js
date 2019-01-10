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

jest.spyOn(Date, "now");
jest.spyOn(djedi, "addNodes");

console.warn = jest.fn();

beforeEach(() => {
  resetAll();
  Date.now.mockReset();
  console.warn.mockReset();
  // Use `mockClear` rather than `mockReset` here to keep the default
  // implementation. (We only spy on `addNodes` and don't mock it).
  djedi.addNodes.mockClear();
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
      expect(node).toMatchInlineSnapshot(`
Object {
  "uri": "i18n://en-us@test.txt",
  "value": "test",
}
`);
      done();
    });
  });

  test("it handles missing node in response", done => {
    fetch({});
    djedi.get({ uri: "test", value: "default" }, node => {
      expect(node).toMatchInlineSnapshot(
        `[Error: Missing result for node: i18n://en-us@test.txt]`
      );
      done();
    });
  });

  test("it handles node with null value in response", done => {
    fetch(simpleNodeResponse("test", null));
    djedi.get({ uri: "test", value: null }, node => {
      expect(node).toMatchInlineSnapshot(`
Object {
  "uri": "i18n://en-us@test.txt",
  "value": null,
}
`);
      done();
    });
  });

  getTests(djedi.get.bind(djedi));

  networkTests(callback => {
    djedi.get({ uri: "test", value: "default" }, callback);
  });

  unknownLanguageTest(language => {
    djedi.get({ uri: "test", value: null }, noop, { language });
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

    // One request for 1 and 2, one for 3.
    await wait();
    expect(fetch.calls()).toMatchInlineSnapshot(`
Array [
  Object {
    "i18n://en-us@1.txt": null,
    "i18n://en-us@2.txt": null,
  },
  Object {
    "i18n://en-us@3.txt": null,
  },
]
`);

    expect(callback.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "uri": "i18n://en-us@1.txt",
      "value": "1",
    },
  ],
  Array [
    Object {
      "uri": "i18n://en-us@1.txt",
      "value": "1",
    },
  ],
  Array [
    Object {
      "uri": "i18n://en-us@1.txt",
      "value": "1",
    },
  ],
  Array [
    Object {
      "uri": "i18n://en-us@2.txt",
      "value": "2",
    },
  ],
  Array [
    Object {
      "uri": "i18n://en-us@3.txt",
      "value": "3",
    },
  ],
]
`);
  });

  test("it uses no timeout if batchInterval=0", async () => {
    fetch(simpleNodeResponse("test", "test"));
    djedi.options.batchInterval = 0;
    const callback = jest.fn();
    djedi.getBatched({ uri: "test", value: undefined }, callback);

    // Only waiting for promises, not for timeouts.
    await waitForPromises();
    expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@test.txt": null,
}
`);

    expect(callback.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "uri": "i18n://en-us@test.txt",
      "value": "test",
    },
  ],
]
`);
  });

  test("it handles missing node in response", async () => {
    fetch(simpleNodeResponse("test", "test"));
    const callback = jest.fn();
    djedi.getBatched({ uri: "test", value: "default" }, callback);
    djedi.getBatched({ uri: "missing", value: "default" }, callback);
    await wait();
    expect(callback.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "uri": "i18n://en-us@test.txt",
      "value": "test",
    },
  ],
  Array [
    [Error: Missing result for node: i18n://en-us@missing.txt],
  ],
]
`);
  });

  getTests(djedi.getBatched.bind(djedi));

  networkTests(callback => {
    djedi.getBatched({ uri: "test", value: "default" }, callback);
  });

  unknownLanguageTest(language => {
    djedi.getBatched({ uri: "test", value: null }, noop, { language });
  });
});

describe("reportPrefetchableNode", () => {
  test("it re-fetches after reporting nodes with different defaults", async () => {
    djedi.addNodes(simpleNodeResponse("test", "default"));
    djedi.reportPrefetchableNode({ uri: "test", value: "default" });
    djedi.reportPrefetchableNode({
      uri: "test",
      value: undefined,
    });
    djedi.reportPrefetchableNode({
      uri: "test",
      value: "other default",
    });

    // The `filter` does not interfere when re-fetching is needed.
    await djedi.prefetch({ filter: () => false });
    expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@test.txt": "other default",
}
`);
  });
});

describe("prefetch", () => {
  test("it works", async () => {
    fetch({
      ...simpleNodeResponse("test", "test"),
      ...simpleNodeResponse("other", "other"),
    });
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    djedi.reportPrefetchableNode({ uri: "other", value: "default" });
    await djedi.prefetch();

    expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@other.txt": "default",
  "i18n://en-us@test.txt": null,
}
`);

    expect(djedi.addNodes.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "i18n://en-us@other.txt": "other",
      "i18n://en-us@test.txt": "test",
    },
  ],
]
`);
  });

  test("it allows filtering nodes", async () => {
    fetch({
      ...simpleNodeResponse("test", "test"),
    });
    const filter = jest.fn(uri => uri.path.startsWith("test"));
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    djedi.reportPrefetchableNode({ uri: "other", value: "default" });
    await djedi.prefetch({ filter });

    expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@test.txt": null,
}
`);

    expect(filter.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "ext": "txt",
      "namespace": "en-us",
      "path": "test",
      "scheme": "i18n",
      "version": "",
    },
  ],
  Array [
    Object {
      "ext": "txt",
      "namespace": "en-us",
      "path": "other",
      "scheme": "i18n",
      "version": "",
    },
  ],
]
`);
  });

  test("it allows passing extra nodes", async () => {
    fetch({
      ...simpleNodeResponse("test", "test"),
      ...simpleNodeResponse("other", "other"),
      ...simpleNodeResponse("extra", "extra"),
    });
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    djedi.reportPrefetchableNode({ uri: "other", value: "default" });
    await djedi.prefetch({
      extra: [
        { uri: "test.txt", value: undefined },
        { uri: "extra", value: "extra" },
      ],
    });

    expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@extra.txt": "extra",
  "i18n://en-us@other.txt": "default",
  "i18n://en-us@test.txt": null,
}
`);
  });

  test("it does not filter the extra nodes", async () => {
    fetch({
      ...simpleNodeResponse("test", "test"),
      ...simpleNodeResponse("extra", "extra"),
    });
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    djedi.reportPrefetchableNode({ uri: "other", value: "default" });
    await djedi.prefetch({
      filter: () => false,
      extra: [
        { uri: "test.txt", value: undefined },
        { uri: "extra", value: "extra" },
      ],
    });

    expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@extra.txt": "extra",
  "i18n://en-us@test.txt": null,
}
`);
  });

  test("it makes no request if there are no nodes to prefetch", async () => {
    djedi.addNodes({ existing: "default" });
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    await djedi.prefetch({
      filter: () => false,
      extra: [{ uri: "existing.txt", value: "default" }],
    });

    expect(fetch.mockFn).toHaveBeenCalledTimes(0);
  });

  test("it does not refetch if cache has expired", async () => {
    const ttl = 10e3;

    const start = new Date("2018-01-01").getTime();
    djedi.setCache(ttl);

    Date.now.mockReturnValue(start);
    djedi.addNodes(simpleNodeResponse("test", "one"));
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });

    await djedi.prefetch();
    expect(fetch.mockFn).toHaveBeenCalledTimes(0);

    Date.now.mockReturnValue(start + ttl + 1);
    await djedi.prefetch();
    expect(fetch.mockFn).toHaveBeenCalledTimes(0);

    const callback = jest.fn();
    djedi.get({ uri: "test", value: undefined }, callback);
    expect(fetch.mockFn).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "uri": "i18n://en-us@test.txt",
      "value": "one",
    },
  ],
]
`);
  });

  test("it re-fetches after using a different language", async () => {
    fetch({
      "i18n://en-us@welcome.txt": "Welcome!",
      "i18n://en-us@extra.txt": "Extra text",
    });
    fetch({
      "i18n://sv-se@welcome.txt": "Välkommen!",
      "i18n://sv-se@extra.txt": "Extra-text",
    });

    const extra = [{ uri: "extra", value: "extra" }];

    djedi.options.languages = {
      default: "en-us",
      additional: ["sv-se"],
    };

    djedi.reportPrefetchableNode({ uri: "welcome", value: "Welcome" });

    await djedi.prefetch({ extra });
    expect(fetch.mockFn).toHaveBeenCalledTimes(1);

    await djedi.prefetch({ extra, language: "sv-se" });
    expect(fetch.mockFn).toHaveBeenCalledTimes(2);

    // The first call has "en-us", while the second has "sv-se". Both use the
    // same defaults, though (nodes can only have one default, and thus in only
    // one language.).
    expect(fetch.calls()).toMatchInlineSnapshot(`
Array [
  Object {
    "i18n://en-us@extra.txt": "extra",
    "i18n://en-us@welcome.txt": "Welcome",
  },
  Object {
    "i18n://sv-se@extra.txt": "extra",
    "i18n://sv-se@welcome.txt": "Welcome",
  },
]
`);
  });

  networkTests(callback => {
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    djedi.prefetch().then(callback, callback);
  });

  unknownLanguageTest(language => {
    djedi.reportPrefetchableNode({ uri: "test", value: undefined });
    djedi.prefetch({ language });
  });
});

describe("track", () => {
  test("it works", async () => {
    fetch(simpleNodeResponse("get1", "get1"));
    fetch(simpleNodeResponse("get2", "get2"));
    fetch({
      ...simpleNodeResponse("getBatched1", "getBatched1"),
      ...simpleNodeResponse("getBatched2", "getBatched2"),
    });
    fetch(simpleNodeResponse("get3", "get3"));

    const nodes = djedi.track();
    expect(nodes).toEqual({});

    const callback = jest.fn();
    djedi.get({ uri: "get1", value: undefined }, callback);
    djedi.get({ uri: "get2", value: undefined }, callback);
    djedi.getBatched({ uri: "getBatched1", value: undefined }, callback);
    djedi.getBatched({ uri: "getBatched2", value: undefined }, callback);
    djedi.get({ uri: "i18n://get1.txt", value: undefined }, callback);

    await wait();

    expect(nodes).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@get1.txt": "get1",
  "i18n://en-us@get2.txt": "get2",
  "i18n://en-us@getBatched1.txt": "getBatched1",
  "i18n://en-us@getBatched2.txt": "getBatched2",
}
`);
    expect(callback).toHaveBeenCalledTimes(5);

    const nodesCopy = { ...nodes };
    const nodes2 = djedi.track();
    const callback2 = jest.fn();
    djedi.get({ uri: "get3", value: undefined }, callback2);

    await wait();

    // `nodes` is not further mutated.
    expect(nodes).toEqual(nodesCopy);

    expect(nodes2).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@get3.txt": "get3",
}
`);
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});

describe("injectAdmin", () => {
  test("it works", async () => {
    fetch("<iframe></iframe>", { stringify: false });
    document.body.innerHTML = "<p>Some content</p>";
    const inserted = await djedi.injectAdmin();
    expect(inserted).toBe(true);
    expect(document.domain).toBe("site.example.com");
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<p>Some content</p><iframe></iframe>"`
    );
  });

  test("it sets document.domain", async () => {
    fetch(
      '<script>document.domain = "example.com";</script><iframe></iframe>',
      { stringify: false }
    );
    document.body.innerHTML = "<p>Some content</p>";
    const inserted = await djedi.injectAdmin();
    expect(inserted).toBe(true);
    expect(document.domain).toBe("example.com");
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<p>Some content</p><script>document.domain = \\"example.com\\";</script><iframe></iframe>"`
    );
  });

  test("handles not having permission", async () => {
    fetch("<h1>403 Forbidden</h1>", { status: 403, stringify: false });
    document.body.innerHTML = "<p>Some content</p>";
    const inserted = await djedi.injectAdmin();
    expect(inserted).toBe(false);
    expect(document.body.innerHTML).toMatchInlineSnapshot(
      `"<p>Some content</p>"`
    );
  });

  test("it handles error status codes", async () => {
    fetch("<h1>Server error 500</h1>", { status: 500, stringify: false });
    await expect(
      djedi.injectAdmin()
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Non-success status code: 500"`
    );
  });

  test("it handles rejected requests", async () => {
    fetch(new Error("Network error"));
    await expect(
      djedi.injectAdmin()
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Network error"`);
  });

  test("it respects options.baseUrl", async () => {
    fetch("", { stringify: false });
    djedi.options.baseUrl = "https://example.com/cms";
    await djedi.injectAdmin();
    expect(fetch.mockFn.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "https://example.com/cms/embed/",
    Object {
      "credentials": "include",
    },
  ],
]
`);
  });
});

describe("reportRenderedNode and reportRemovedNode", () => {
  test("they work", () => {
    djedi.options.languages = {
      default: "en-us",
      additional: ["sv-se", "de-de"],
    };

    expect(window.DJEDI_NODES).toMatchInlineSnapshot(`Object {}`);

    djedi.reportRenderedNode({ uri: "first", value: "first" });
    djedi.reportRenderedNode({ uri: "first", value: "first" });
    djedi.reportRenderedNode({ uri: "second", value: "second" });
    djedi.reportRenderedNode(
      { uri: "third", value: "third" },
      { language: "sv-se" }
    );
    expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@first.txt": "first",
  "i18n://en-us@second.txt": "second",
  "i18n://sv-se@third.txt": "third",
}
`);

    djedi.reportRemovedNode("first");
    expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@first.txt": "first",
  "i18n://en-us@second.txt": "second",
  "i18n://sv-se@third.txt": "third",
}
`);

    djedi.reportRemovedNode("first");
    expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@second.txt": "second",
  "i18n://sv-se@third.txt": "third",
}
`);

    djedi.reportRemovedNode("second");
    djedi.reportRemovedNode("third");
    djedi.reportRemovedNode("third", { language: "de-de" });
    expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://sv-se@third.txt": "third",
}
`);

    djedi.reportRemovedNode("third", { language: "sv-se" });
    expect(window.DJEDI_NODES).toMatchInlineSnapshot(`Object {}`);
  });

  test("they handle an already present window.DJEDI_NODES", () => {
    window.DJEDI_NODES = simpleNodeResponse("already", "existing");
    expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@already.txt": "existing",
}
`);

    djedi.constructor();
    djedi.reportRenderedNode({ uri: "test", value: "test" });
    expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@already.txt": "existing",
  "i18n://en-us@test.txt": "test",
}
`);

    djedi.reportRemovedNode("test");
    expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@already.txt": "existing",
}
`);
  });

  test("reportRenderedNode uses the last default when rendering nodes with different defaults", () => {
    djedi.reportRenderedNode({ uri: "test", value: "default" });
    djedi.reportRenderedNode({ uri: "i18n://test.txt", value: undefined });
    djedi.reportRenderedNode({ uri: "en-us@test", value: "other default" });

    expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@test.txt": "other default",
}
`);
  });

  test("reportRemovedNode handles trying to remove a non-existing node", () => {
    expect(() => {
      djedi.reportRemovedNode("test");
    }).not.toThrow();
  });

  test("the admin sidebar is updated", async () => {
    const iframe = document.createElement("iframe");
    iframe.id = "djedi-cms";
    iframe.src = "/test/src.html";
    const srcSpy = jest.spyOn(iframe, "src", "set");
    document.body.append(iframe);
    expect(document.getElementById("djedi-cms")).toBe(iframe);

    function reset() {
      srcSpy.mockClear();

      const num = 3;
      for (let i = 0; i < num; i++) {
        const span = document.createElement("span");
        span.className = "djedi-node-outline";
        document.body.append(span);
      }
      expect(
        document.getElementsByClassName("djedi-node-outline")
      ).toHaveLength(num);

      document.documentElement.style.width = "1600px";
    }

    function assert() {
      // iframe has been reloaded.
      expect(srcSpy).toHaveBeenCalledTimes(1);
      expect(srcSpy).toHaveBeenCalledWith(iframe.src);

      // Outlines have been removed.
      expect(
        document.getElementsByClassName("djedi-node-outline")
      ).toHaveLength(0);

      // Width has been reset.
      expect(document.documentElement.style.width).toBe("");
    }

    // Rendered.
    reset();
    djedi.reportRenderedNode({ uri: "test", value: "test" });
    await wait();
    assert();

    // Removed.
    reset();
    djedi.reportRemovedNode("test");
    await wait();
    assert();

    // Removing a non-existing node does not trigger update.
    srcSpy.mockClear();
    djedi.reportRemovedNode("test");
    await wait();
    expect(srcSpy).toHaveBeenCalledTimes(0);

    // Batching.
    reset();
    djedi.reportRenderedNode({ uri: "test", value: "test" });
    djedi.reportRemovedNode("test");
    await wait();
    assert();
  });

  unknownLanguageTest(language => {
    djedi.reportRenderedNode({ uri: "test", value: "test" }, { language });
  });

  unknownLanguageTest(language => {
    djedi.reportRemovedNode("test", { language });
  });
});

describe("element", () => {
  test("it works", () => {
    expect(djedi.element("test")).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "data-i18n": "en-us@test",
  },
  "tag": "span",
}
`);

    expect(djedi.element("i18n://sv-se@home/intro.md#5"))
      .toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "data-i18n": "sv-se@home/intro",
  },
  "tag": "span",
}
`);
  });
});

describe("setCache", () => {
  test("it works", async () => {
    fetch({ "i18n://en-us@test.txt#1": "edited" });

    const start = new Date("2018-01-01").getTime();
    const end = new Date("2118-01-01").getTime();

    Date.now.mockReturnValue(start);
    djedi.addNodes(simpleNodeResponse("test", "default"));

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

    // Called immediately since the cache hasn’t expired yet.
    Date.now.mockReturnValue(start + ttl);
    djedi.get({ uri: "test", value: "test" }, callback3);
    expect(callback3).toHaveBeenCalledTimes(1);

    // Imagine the user having edited the node in the Djedi sidebar since the
    // last request. The callback is called immediately with the old value, but
    // sends a request to refresh.
    Date.now.mockReturnValue(start + ttl + 1);
    djedi.get({ uri: "test", value: "test" }, callback3);
    expect(callback3).toHaveBeenCalledTimes(2);

    await wait();

    // The callback isn’t called again.
    expect(callback3).toHaveBeenCalledTimes(2);

    // The new, refreshed (user edited) value is now available.
    djedi.get({ uri: "test", value: "test" }, callback3);
    expect(callback3.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "uri": "i18n://en-us@test.txt",
      "value": "default",
    },
  ],
  Array [
    Object {
      "uri": "i18n://en-us@test.txt",
      "value": "default",
    },
  ],
  Array [
    Object {
      "uri": "i18n://en-us@test.txt#1",
      "value": "edited",
    },
  ],
]
`);
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
        scheme2: "{namespace2}",
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

    expect(callback.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "uri": "scheme<SCHEME>namespace<NAMESPACE>test<EXT>ext<VERSION>version",
      "value": "text1",
    },
  ],
  Array [
    Object {
      "uri": "scheme<SCHEME>namespace<NAMESPACE>test<EXT>ext<VERSION>version",
      "value": "text1",
    },
  ],
  Array [
    Object {
      "uri": "scheme<SCHEME>namespace<NAMESPACE>test<EXT>md<VERSION>version",
      "value": "text2",
    },
  ],
  Array [
    Object {
      "uri": "scheme<SCHEME>namespace<NAMESPACE>test<EXT>md<VERSION>version",
      "value": "text2",
    },
  ],
  Array [
    Object {
      "uri": "scheme2<SCHEME>{namespace2}<NAMESPACE>test<EXT>ext<VERSION>version",
      "value": "text3",
    },
  ],
  Array [
    Object {
      "uri": "scheme2<SCHEME>namespace3<NAMESPACE>home<PATH>test<EXT>html<VERSION>5",
      "value": "text4",
    },
  ],
]
`);
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

  test("it warns about rejected refresh requests", async () => {
    fetch(new Error("Network error"));
    fetch(simpleNodeResponse("test", "two"));

    const ttl = 10e3;
    const start = new Date("2018-01-01").getTime();
    djedi.setCache(ttl);
    Date.now.mockReturnValue(start);
    djedi.addNodes(simpleNodeResponse("test", "one"));

    // The callback is called immediately with the old value, but sends a
    // request to refresh.
    Date.now.mockReturnValue(start + ttl + 1);
    const callback1 = jest.fn();
    fn({ uri: "test", value: undefined }, callback1);
    expect(callback1.mock.calls).toMatchSnapshot("callback1");
    expect(console.warn).toHaveBeenCalledTimes(0);

    // The request fails and is warned about.
    await wait();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.calls).toMatchSnapshot("warning");

    // The callback is called immediately with the old value, but sends a
    // request to refresh.
    const callback2 = jest.fn();
    fn({ uri: "test", value: undefined }, callback2);
    expect(callback2.mock.calls).toMatchSnapshot("callback2");

    // The request succeeds.
    await wait();
    expect(console.warn).toHaveBeenCalledTimes(1);
    const callback3 = jest.fn();
    fn({ uri: "test", value: undefined }, callback3);
    expect(callback3.mock.calls).toMatchSnapshot("callback3");
  });

  test("it handles the language option", done => {
    djedi.options.languages = {
      default: "en-us",
      additional: ["sv-se"],
    };

    fetch({ "i18n://sv-se@test.txt": "test" });
    fn(
      { uri: "test", value: "default" },
      node => {
        expect(node).toMatchSnapshot();
        done();
      },
      { language: "sv-se" }
    );
    jest.runAllTimers();
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
    fetch('{ "invalid": true', {
      status: 200,
      stringify: false,
      contentType: "application/json",
    });
    fn(result => {
      expect(errorDetails(result)).toMatchSnapshot();
      done();
    });
    await wait();
  });

  test("it respects options.baseUrl", async () => {
    djedi.options.baseUrl = "https://example.com/cms";
    const callback = jest.fn();
    fn(callback);
    await wait();
    expect(fetch.mockFn.mock.calls).toMatchSnapshot();
    expect(callback).toHaveBeenCalledTimes(1);
  });
}

function unknownLanguageTest(fn) {
  test("it warns if passing an unknown language", async () => {
    djedi.options.languages = {
      default: "en",
      additional: ["fi", "dk"],
    };

    fn("sv");
    fn("sv");
    fn("no");

    await wait;

    // The warning is only logged once per language.
    expect(console.warn).toHaveBeenCalledTimes(2);

    expect(console.warn.mock.calls).toMatchSnapshot();
  });
}

function noop() {
  // Do nothing.
}
