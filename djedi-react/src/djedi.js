/* eslint-disable prefer-promise-reject-errors */

// This file does not contain anything React-specific. If need JS client for
// another framework this file could be extracted into its own package and be
// re-used.

import unfetch from "isomorphic-unfetch";

import { applyUriDefaults, parseUri, stringifyUri } from "./uri";
import Cache from "./Cache";

const DEFAULT_CACHE_TTL = typeof window === "undefined" ? 20e3 : Infinity; // ms
const DOCUMENT_DOMAIN_REGEX = /\bdocument\.domain\s*=\s*(["'])([^'"\s]+)\1/;
const UPDATE_ADMIN_SIDEBAR_TIMEOUT = 10; // ms

/*
This class fetches and caches nodes, provides global options, and keeps
`window.DJEDI_NODES` up-to-date.
*/
export class Djedi {
  constructor() {
    this.options = makeDefaultOptions();

    // `Cache<uri: string, Node>`. Cache of all fetched nodes.
    this._nodes = new Cache({ ttl: DEFAULT_CACHE_TTL });

    // `Map<uri: string, Node>`. Tracks everything that `reportPrefetchableNode`
    // has reported. The nodes contain default values (if any).
    this._prefetchableNodes = new Map();

    // `{ [uri: string]: string }`. The return value of the last `prefetch` call.
    // Mutated by `get` and `getBatched`. The values come from fetched nodes.
    this._lastPrefetch = {};

    // Queue for `getBatched`.
    this._batch = makeEmptyBatch();

    // `Map<uri: string, number>`. Tracks everything that `reportRenderedNode`
    // has reported. The number shows how many nodes of the `uri` in question
    // are rendered. Used to keep `_DJEDI_NODES` up-to-date.
    this._renderedNodes = new Map();

    // `{ [uri: string]: string }`. The values are default values (if any). //
    // The admin sidebar expects the following mapping of all rendered nodes on
    // the page: `window.DJEDI_NODES = { "<uri>": "<default>" }`.
    this._DJEDI_NODES = {};

    // Whenever a node is rendered or removed the admin sidebar needs to be
    // refreshed. This is used to batch that refreshing.
    this._updateAdminSidebarTimeoutId = undefined;

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

  resetState() {
    // istanbul ignore next
    if (this._batch.timeoutId != null) {
      clearTimeout(this._batch.timeoutId);
    }
    // istanbul ignore next
    if (this._updateAdminSidebarTimeoutId != null) {
      clearTimeout(this._updateAdminSidebarTimeoutId);
    }

    this._nodes = new Cache({ ttl: DEFAULT_CACHE_TTL });
    this._prefetchableNodes = new Map();
    this._lastPrefetch = {};
    this._batch = makeEmptyBatch();
    this._renderedNodes = new Map();
    this._DJEDI_NODES = {};
    this._updateAdminSidebarTimeoutId = undefined;

    if (typeof window !== "undefined") {
      window.DJEDI_NODES = this._DJEDI_NODES;
    }
  }

  setCache(ttl) {
    this._nodes.ttl = ttl;
  }

  get(passedNode, callback) {
    const node = this._normalizeNode(passedNode);
    const { uri } = node;
    const existing = this._nodes.get(uri);

    if (existing != null) {
      this._callback(callback, existing.node);

      if (!existing.needsRefresh) {
        return;
      }
    }

    this._fetchMany({ [node.uri]: node.value }).then(
      () => {
        if (existing == null) {
          const maybeNode = this._nodes.get(uri);
          this._callback(
            callback,
            maybeNode == null ? missingUriError(uri) : maybeNode.node
          );
        } else {
          // The node needed refresh and has now been refreshed and put into
          // cache. Nothing more to do.
        }
      },
      error => {
        if (existing == null) {
          this._callback(callback, error);
        } else {
          console.warn("djedi-react: Failed to refresh node", node, error);
        }
      }
    );
  }

  getBatched(passedNode, callback) {
    if (this.options.batchInterval <= 0) {
      this.get(passedNode, callback);
      return;
    }

    const node = this._normalizeNode(passedNode);
    const existing = this._nodes.get(node.uri);

    if (existing != null) {
      this._callback(callback, existing.node);

      if (!existing.needsRefresh) {
        return;
      }
    }

    const previous = this._batch.queue.get(node.uri) || {
      node,
      callbacks: [],
    };
    previous.callbacks.push(
      existing == null
        ? callback
        : maybeNode => {
            if (maybeNode instanceof Error) {
              console.warn(
                "djedi-react: Failed to refresh node",
                node,
                maybeNode
              );
            } else {
              // The node needed refresh and has now been refreshed and put into
              // cache. Nothing more to do.
            }
          }
    );
    this._batch.queue.set(node.uri, previous);

    if (this._batch.timeoutId != null) {
      return;
    }

    this._batch.timeoutId = setTimeout(
      this._flushBatch.bind(this),
      this.options.batchInterval
    );
  }

  reportPrefetchableNode(passedNode) {
    const node = this._normalizeNode(passedNode);
    const previous = this._prefetchableNodes.get(node.uri);

    // During development, it is not uncommon to change defaults. If so, delete
    // the cached entry so the node can be re-fetched.
    if (previous != null && previous.value !== node.value) {
      this._nodes.delete(previous.uri);
    }

    this._prefetchableNodes.set(node.uri, node);
  }

  prefetch({ filter = undefined, extra = [] } = {}) {
    const nodes = {};
    this._prefetchableNodes.forEach(node => {
      if (
        this._nodes.get(node.uri) == null &&
        (filter == null ||
          filter(this._parseUri(node.uri, { applyDefaults: false })))
      ) {
        nodes[node.uri] = node.value;
      }
    });
    extra.forEach(node => {
      const uri = this._normalizeUri(node.uri);
      if (this._nodes.get(uri) == null) {
        nodes[uri] = node.value;
      }
    });

    const promise =
      Object.keys(nodes).length === 0
        ? Promise.resolve({})
        : this._fetchMany(nodes);

    return promise.then(results => {
      this._lastPrefetch = results;
      return results;
    });
  }

  // Needed to pick up the results from `prefetch` after server-side rendering.
  addNodes(nodes) {
    Object.keys(nodes).forEach(uri => {
      const uriObject = this._parseUri(uri);
      const value = nodes[uri];

      const node = { uri: this._stringifyUri(uriObject), value };
      this._nodes.set(node.uri, node);

      // If the returned node URI has a version, also set the versionless URI to
      // the same node. A request for `home/text.md` can return a URI ending
      // with for example `home/text.md#1` if the user has edited the node.
      if (uriObject.version) {
        const versionlessUri = this._stringifyUri({
          ...uriObject,
          version: "",
        });

        // If the versionless URI has already been set, don’t update it so that
        // if a node re-renders it doesn’t unexpectedly change its text.
        if (this._nodes.get(versionlessUri) == null) {
          this._nodes.set(versionlessUri, node);
        }
      }
    });
  }

  injectAdmin() {
    if (typeof document === "undefined") {
      return Promise.resolve(false);
    }

    const url = `${this.options.baseUrl}/embed/`;

    return unfetch(url, { credentials: "include" }).then(response => {
      if (response.status >= 200 && response.status < 400) {
        return response.text().then(html => {
          // Browsers don’t allow <script> tags inserted as part of an HTML
          // chunk to modify `document.domain`, so cut out the domain and set it
          // manually.
          const [, , domain] = DOCUMENT_DOMAIN_REGEX.exec(html) || [];
          if (domain != null) {
            document.domain = domain;
          }
          document.body.insertAdjacentHTML("beforeend", html);
          return true;
        });
      }
      if (response.status === 403) {
        return false;
      }
      return Promise.reject(
        createStatusCodeError(
          response.status,
          "200 <= status < 400 or status = 403"
        )
      );
    });
  }

  reportRenderedNode(passedNode) {
    const node = this._normalizeNode(passedNode);
    const previous = this._renderedNodes.get(node.uri);
    const numInstances = previous == null ? 1 : previous + 1;

    this._renderedNodes.set(node.uri, numInstances);
    this._DJEDI_NODES[this._djediNodesUri(node.uri)] = node.value;
    this._updateAdminSidebar();
  }

  reportRemovedNode(passedUri) {
    const uri = this._normalizeUri(passedUri);
    const previous = this._renderedNodes.get(uri);

    if (previous == null) {
      return;
    }

    const numInstances = previous - 1;

    if (numInstances <= 0) {
      this._renderedNodes.delete(uri);
      delete this._DJEDI_NODES[this._djediNodesUri(uri)];
      this._updateAdminSidebar();
    } else {
      this._renderedNodes.set(uri, numInstances);
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

  // Calls `callback(node)` and also updates the last return value of
  // `djedi.prefetch()`. This is really ugly but needed for server-side
  // rendering.
  _callback(callback, node) {
    if (!(node instanceof Error)) {
      this._lastPrefetch[node.uri] = node.value;
    }
    callback(node);
  }

  _parseUri(uri, { applyDefaults = true } = {}) {
    const { defaults, namespaceByScheme, separators } = this.options.uri;
    const uriObject = parseUri(uri, separators);
    return applyDefaults
      ? applyUriDefaults(uriObject, defaults, namespaceByScheme)
      : uriObject;
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

    this._fetchMany(nodes).then(
      () => {
        queue.forEach((data, uri) => {
          const maybeNode = this._nodes.get(uri);
          const node =
            maybeNode == null ? missingUriError(uri) : maybeNode.node;
          data.callbacks.forEach(callback => {
            this._callback(callback, node);
          });
        });
      },
      error => {
        queue.forEach(data => {
          data.callbacks.forEach(callback => {
            this._callback(callback, error);
          });
        });
      }
    );
  }

  _fetchMany(nodes) {
    // `JSON.stringify` excludes keys whose values are `undefined`. Change them
    // to `null` so that all keys are sent to the backend.
    const nodesWithNull = Object.keys(nodes).reduce((result, key) => {
      const value = nodes[key];
      result[key] = value === undefined ? null : value;
      return result;
    }, {});
    return this._post("/nodes/", nodesWithNull).then(results => {
      this.addNodes(results);
      return results;
    });
  }

  _post(passedUrl, data) {
    const url = `${this.options.baseUrl}${passedUrl}`;
    const info = { method: "POST", apiUrl: url, data };

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
            error: createStatusCodeError(
              response.status,
              "200 <= status < 400"
            ),
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

  _updateAdminSidebar() {
    if (this._updateAdminSidebarTimeoutId != null) {
      clearTimeout(this._updateAdminSidebarTimeoutId);
    }
    this._updateAdminSidebarTimeoutId = setTimeout(() => {
      this._updateAdminSidebarTimeoutId = undefined;
      updateAdminSidebar();
    }, UPDATE_ADMIN_SIDEBAR_TIMEOUT);
  }
}

// This is a function, not a constant, since it can be mutated by the user.
function makeDefaultOptions() {
  return {
    baseUrl: "/djedi",
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

function createStatusCodeError(status, expected) {
  const error = new Error(
    `Unexpected response status code. Got ${status} but expected ${expected}.`
  );
  error.status = status;
  return error;
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

function updateAdminSidebar() {
  if (typeof document === "undefined") {
    return;
  }

  const iframe = document.getElementById("djedi-cms");

  if (iframe == null) {
    return;
  }

  // The sidebar sets a width on `<html>` when the sidebar is open.
  document.documentElement.style.width = "";

  // Remove old outline elements.
  [].forEach.call(document.querySelectorAll(".djedi-node-outline"), element => {
    element.parentNode.removeChild(element);
  });

  // Reload the iframe.
  // eslint-disable-next-line no-self-assign
  iframe.src = iframe.src;
}

export default new Djedi();
