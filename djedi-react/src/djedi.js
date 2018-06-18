// This file does not contain anything React-specific. If need JS client for
// another framework this file could be extracted into its own package and be
// re-used.

import { applyUriDefaults, parseUri, stringifyUri } from "./uri";

/*
This class fetches and caches nodes, and keeps `window.DJEDI_NODES` up-todate.

Central interface:

    type Node = {
      // Input nodes: Possibly non-absolute URI.
      // Output nodes: Absolute, normalized URI.
      uri: string,
      // Input nodes: The default value, if any.
      // Output nodes: The final value, if any. The final value can be the
      // default value, or a new value entered by the user. In both cases the
      // backend might have rendered the value (such as markdown -> HTML).
      value: string | undefined,
    }

The admin sidebar expects the following mapping of all rendered nodes on the page:

    window.DJEDI_NODES = {
      "<uri>": "<default>",
    }
*/
export class Djedi {
  constructor() {
    this.options = makeDefaultOptions();

    this._nodes = new Map();
    this._renderedNodes = new Map();
    this._batch = makeEmptyBatch();
    this._DJEDI_NODES = {};

    if (typeof window !== "undefined") {
      if (window.DJEDI_NODES == null) {
        window.DJEDI_NODES = {};
      }
      this._DJEDI_NODES = window.DJEDI_NODES;
    }
  }

  get(passedNode, callback) {
    const node = this._normalizeNode(passedNode);
    const { uri } = node;
    const existingNode = this._nodes.get(uri);

    if (existingNode != null) {
      callback(existingNode);
      return;
    }

    this.loadMany([node]).then(
      results => {
        callback(results[uri] || new Error(`Missing result for node: ${uri}`));
      },
      error => {
        callback(error);
      }
    );
  }

  getBatched(passedNode, callback) {
    if (this.options.batchInterval <= 0) {
      this.get(passedNode, callback);
      return;
    }

    const node = this._normalizeNode(passedNode);
    const existingNode = this._nodes.get(node.uri);

    if (existingNode != null) {
      callback(existingNode);
      return;
    }

    const previous = this._batch.queue.get(node.uri) || {
      node,
      callbacks: [],
    };
    previous.callbacks.push(callback);

    if (this._batch.timeoutId != null) {
      return;
    }

    this._batch.timeoutId = setTimeout(
      this._flushBatch.bind(this),
      this.options.batchInterval
    );
  }

  async loadMany(nodes) {
    console.log("TODO: loadMany", nodes, this.options.baseUrl);
    try {
      const results = await Promise.resolve([]);
      this.addNodes(results);
      return results;
    } catch (passedError) {
      const error =
        passedError instanceof Error
          ? passedError
          : new Error(`Failed to load nodes: ${passedError}`);
      throw error;
    }
  }

  async loadByPrefix(prefixes) {
    const results = await Promise.resolve([]);
    console.log("TODO: preloadByPrefix", prefixes, results);
    this.addNodes(results);
    return results;
  }

  // Needed to pick up the results from `loadByPrefix` after server-side
  // rendering.
  addNodes(nodes) {
    for (const passedNode of nodes) {
      const node = this._normalizeNode(passedNode);
      this._nodes.set(node.uri, node);
    }
  }

  injectAdmin() {
    console.log("TODO: injectAdmin (maybe)");
  }

  reportRenderedNode(passedNode) {
    const node = this._normalizeNode(passedNode);
    const previous = this._renderedNodes.get(node.uri);

    if (previous != null) {
      if (previous.value !== node.value) {
        console.warn(
          "djedi-react: Rendering a node with with a different default value. That default will be ignored.",
          {
            uri: node.uri,
            prev: previous.value,
            next: node.value,
          }
        );
      }
      previous.numInstances++;
      return;
    }

    this._renderedNodes.set({
      value: node.value,
      numInstances: 1,
    });

    this._DJEDI_NODES[this._djediNodesUri(node.uri)] = node.value;
  }

  reportRemovedNode(passedUri) {
    const uri = this._normalizeUri(passedUri);
    const previous = this._renderedNodes.get(uri);

    if (previous == null) {
      return;
    }

    previous.numInstances--;

    if (previous.numInstances <= 0) {
      this._renderedNodes.delete(uri);
      delete this._DJEDI_NODES[this._djediNodesUri(uri)];
    }
  }

  resetOptions() {
    this.options = makeDefaultOptions();
  }

  resetNodes() {
    if (this._batch.timeoutId != null) {
      clearTimeout(this._batch.timeoutId);
    }

    this._nodes = new Map();
    this._renderedNodes = new Map();
    this._batch = makeEmptyBatch();
    this._DJEDI_NODES = {};

    if (typeof window !== "undefined") {
      window.DJEDI_NODES = this._DJEDI_NODES;
    }
  }

  element(uri) {
    const uriObject = this._parseUri(uri);
    return {
      tag: "span",
      attributes: {
        "data-i18n": this._stringifyUri({
          ...uriObject,
          scheme: "",
          ext: "",
          version: "",
        }),
      },
    };
  }

  _parseUri(uri) {
    const { defaults, namespaceByScheme, separators } = this.options.uri;
    const uriObject = parseUri(uri, separators);
    return applyUriDefaults(uriObject, defaults, namespaceByScheme);
  }

  _stringifyUri(uriObject) {
    return stringifyUri(uriObject, this.options.uri.separators);
  }

  _normalizeUri(uri) {
    return this._stringifyUri(this._parseUri(uri));
  }

  _normalizeNode(node) {
    return {
      ...node,
      uri: this._stringifyUri(this._parseUri(node.uri)),
    };
  }

  _djediNodesUri(uri) {
    const uriObject = this._parseUri(uri);
    return this._stringifyUri({ ...uriObject, version: "" });
  }

  async _flushBatch() {
    const { queue } = this._batch;
    const nodes = Array.from(queue).reduce((result, [uri, data]) => {
      result[uri] = data.node.value;
      return result;
    });

    this._batch = makeEmptyBatch();

    try {
      const results = this.loadMany(nodes);
      for (const [uri, data] of queue) {
        const value = results[uri];
        const node =
          value == null
            ? new Error(`Missing result for node: ${uri}`)
            : { uri, value };
        for (const callback of data.callbacks) {
          callback(node);
        }
      }
    } catch (error) {
      for (const [, data] of queue) {
        for (const callback of data.callbacks) {
          callback(error);
        }
      }
    }
  }
}

// This is a function, not a constant, since it can be mutated by the user.
function makeDefaultOptions() {
  return {
    baseUrl: "",
    batchInterval: 50, // ms
    defaultRender: {
      loading: "Loading…",
      error: "Failed to fetch content 😞",
    },
    uri: {
      defaults: {
        scheme: "i18n",
        namespace: "",
        path: "",
        ext: "txt",
        version: "",
      },
      namespaceByScheme: {
        i18n: "en-us",
        l10n: "local",
        g11n: "global",
      },
      separators: {
        scheme: "://",
        namespace: "@",
        path: "/",
        ext: ".",
        version: "#",
      },
    },
  };
}

// This is a function, not a constant, since it will be mutated.
function makeEmptyBatch() {
  return {
    timeoutId: undefined,
    queue: new Map(),
  };
}

export default new Djedi();
