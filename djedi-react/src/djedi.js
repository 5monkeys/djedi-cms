/* eslint-disable prefer-promise-reject-errors */

// This file does not contain anything React-specific. If need JS client for
// another framework this file could be extracted into its own package and be
// re-used.

import unfetch from "isomorphic-unfetch";

import { applyUriDefaults, parseUri, stringifyUri } from "./uri";

/*
This class fetches and caches nodes, provides global options, and keeps
`window.DJEDI_NODES` up-to-date. See the docs for more information.

The admin sidebar expects the following mapping of all rendered nodes on the page:

    window.DJEDI_NODES = {
      "<uri>": "<default>",
    }
*/
export class Djedi {
  constructor() {
    this.options = makeDefaultOptions();

    this._nodes = new Map();
    this._prefetchableNodes = new Map();
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

  resetOptions() {
    this.options = makeDefaultOptions();
  }

  resetNodes() {
    if (this._batch.timeoutId != null) {
      clearTimeout(this._batch.timeoutId);
    }

    this._nodes = new Map();
    this._prefetchableNodes = new Map();
    this._renderedNodes = new Map();
    this._batch = makeEmptyBatch();
    this._DJEDI_NODES = {};

    if (typeof window !== "undefined") {
      window.DJEDI_NODES = this._DJEDI_NODES;
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

    this.fetchMany({ [node.uri]: node.value }).then(
      results => {
        const value = results[uri];
        const resultNode =
          value == null ? missingUriError(uri) : { uri, value };
        callback(resultNode);
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
    this._batch.queue.set(node.uri, previous);

    if (this._batch.timeoutId != null) {
      return;
    }

    this._batch.timeoutId = setTimeout(
      this._flushBatch.bind(this),
      this.options.batchInterval
    );
  }

  fetchMany(nodes) {
    // `JSON.stringify` excludes keys whose values are `undefined`. Change them
    // to `null` so that all keys are sent to the backend.
    const nodesWithNull = Object.keys(nodes).reduce((result, key) => {
      const value = nodes[key];
      result[key] = value === undefined ? null : value;
      return result;
    }, {});
    return this._post("/djedi/load_many", nodesWithNull).then(results => {
      this.addNodes(results);
      return results;
    });
  }

  reportPrefetchableNode(passedNode) {
    const node = this._normalizeNode(passedNode);
    const previous = this._prefetchableNodes.get(node.uri);
    if (previous != null && previous.value !== node.value) {
      console.warn(
        "djedi-react: Encountered two nodes with the same URI but with different default values. Using the previous value and ignoring the next.",
        {
          uri: node.uri,
          prev: previous.value,
          next: node.value,
        }
      );
      return;
    }
    this._prefetchableNodes.set(node.uri, node);
  }

  prefetch({ filter = undefined, extra = [] } = {}) {
    const { separators } = this.options.uri;

    const nodes = {};
    this._prefetchableNodes.forEach(node => {
      if (
        !this._nodes.has(node.uri) &&
        (filter == null || filter(parseUri(node.uri, separators)))
      ) {
        nodes[node.uri] = node.value;
      }
    });
    extra.forEach(node => {
      const uri = this._normalizeUri(node.uri);
      if (!this._nodes.has(uri)) {
        nodes[uri] = node.value;
      }
    });

    return Object.keys(nodes).length === 0
      ? Promise.resolve({})
      : this.fetchMany(nodes);
  }

  // Needed to pick up the results from `prefetch` after server-side rendering.
  addNodes(nodes) {
    Object.keys(nodes).forEach(uri => {
      const node = { uri: this._normalizeUri(uri), value: nodes[uri] };
      this._nodes.set(node.uri, node);
    });
  }

  // injectAdmin() {
  //   console.log("TODO: injectAdmin (maybe)");
  // }

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

    this._renderedNodes.set(node.uri, {
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
      uri: this._normalizeUri(node.uri),
    };
  }

  _djediNodesUri(uri) {
    const uriObject = this._parseUri(uri);
    return this._stringifyUri({ ...uriObject, version: "" });
  }

  _flushBatch() {
    const { queue } = this._batch;

    const nodes = {};
    queue.forEach((data, uri) => {
      nodes[uri] = data.node.value;
    });

    this._batch = makeEmptyBatch();

    this.fetchMany(nodes).then(
      results => {
        queue.forEach((data, uri) => {
          const value = results[uri];
          const node = value == null ? missingUriError(uri) : { uri, value };
          data.callbacks.forEach(callback => {
            callback(node);
          });
        });
      },
      error => {
        queue.forEach(data => {
          data.callbacks.forEach(callback => {
            callback(error);
          });
        });
      }
    );
  }

  _post(passedUrl, data) {
    const info = { method: "POST", apiUrl: passedUrl, data };
    const url = `${this.options.baseUrl}${passedUrl}`;

    return unfetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Make the body easier to read in test snapshots. It’s important to still
      // call `JSON.stringify` so we know that `data` actually can be
      // stringified.
      body:
        // istanbul ignore next
        // eslint-disable-next-line no-undef
        typeof process !== "undefined" && process.env.NODE_ENV === "test"
          ? JSON.parse(JSON.stringify(data))
          : JSON.stringify(data),
    })
      .then(
        response => {
          if (response.status >= 200 && response.status < 400) {
            return response
              .json()
              .catch(error => Promise.reject({ response, error }));
          }
          return Promise.reject({
            response,
            error: createStatusCodeError(response),
          });
        },
        passedError => {
          // In IE11 the error can be a `ProgressEvent` (I guess it’s due to how
          // the `unfetch` “polyfill” is implemented). Make sure to always
          // return `Error`s so `foo instanceof Error` checks can be used.
          // istanbul ignore next
          const error =
            passedError instanceof Error
              ? passedError
              : new Error("fetch error");
          return Promise.reject({ response: undefined, error });
        }
      )
      .catch(({ response, error }) => {
        error.message = createUpdatedErrorMessage(error, info, response);
        error.status = response == null ? -1 : response.status;

        const textPromise =
          response == null || response.bodyUsed
            ? Promise.resolve("")
            : response.text().then(
                text => text,
                // istanbul ignore next
                () => ""
              );

        return textPromise.then(text => {
          error.responseText = text;
          return Promise.reject(error);
        });
      });
  }
}

// This is a function, not a constant, since it can be mutated by the user.
function makeDefaultOptions() {
  return {
    baseUrl: "",
    batchInterval: 10, // ms
    defaultRender: state => {
      switch (state.type) {
        case "loading":
          return "Loading…";
        case "error":
          return `Failed to fetch content 😞 (${state.error.status})`;
        case "success":
          return state.content;
        // istanbul ignore next
        default:
          return null;
      }
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

function createStatusCodeError(response) {
  return new Error(
    `Unexpected response status code. Got ${
      response.status
    } but expected 200 <= status < 400.`
  );
}

function createUpdatedErrorMessage(error, info, response) {
  return [
    `Djedi API error for request: ${info.method} ${info.apiUrl}`,
    `RequestData sent: ${JSON.stringify(info.data, null, 2)}`,
    `Response: ${
      response ? `${response.status} ${response.statusText}` : response
    }`,
    String(error),
  ].join("\n");
}

function missingUriError(uri) {
  const error = new Error(`Missing result for node: ${uri}`);
  error.status = 1404;
  return error;
}

export default new Djedi();
