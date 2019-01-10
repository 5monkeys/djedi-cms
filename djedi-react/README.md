<img alt="Djedi CMS" src="https://djedi-cms.org/_static/djedi-landscape.svg" width="500"/>

# djedi-react

[React] client for [Djedi CMS].

Requires djedi-cms version 1.2.1 or later.

## Contents

<!-- prettier-ignore-start -->
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
- [Browser support](#browser-support)
- [Usage](#usage)
- [Server-side rendering](#server-side-rendering)
  - [Security](#security)
- [Reference](#reference)
  - [`Node`](#node)
  - [`NodeContext`](#nodecontext)
  - [`djedi`](#djedi)
  - [`md`](#md)
- [Django settings](#django-settings)
  - [Cross-domain](#cross-domain)
  - [Prettier and markdown](#prettier-and-markdown)
- [Development](#development)
  - [npm scripts](#npm-scripts)
  - [docker](#docker)
  - [Directories](#directories)
  - [Notes](#notes)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
<!-- prettier-ignore-end -->

## Installation

```
npm install djedi-react react react-dom
```

```js
import { Node, NodeContext, djedi, md } from "djedi-react";
```

Optional [Babel] plugin (for better errors, prefetching and [server-side
rendering]):

```json5
// .babelrc
{
  plugins: ["djedi-react/babel-plugin"],
}
```

See also [options](#options) and [Django settings](#django-settings).

## Browser support

All the latest browsers plus Internet Explorer 11 (which requires a `Promise`
polyfill).

## Usage

The library is designed to mimic the Django template tags as closely as
possible. In Django world there are two tags, `node` and `blocknode`:

```django
{% node 'page/title.txt' default='Djedi' %}

{% blocknode 'page/body.md' %}
    ## I’m a djedi apprentice
    This is fun!
{% endblocknode %}
```

In React world, there’s no need for two tags. (`blocknode` can do everything
that `node` can do – `node` is just a shortcut for simple nodes.) So
`djedi-react` only has `<Node>`, which closely mimics `blocknode`.

```js
import { Node, djedi, md } from "djedi-react";

function Home() {
  return (
    <div>
      <h1>
        {/* Simple node. */}
        <Node uri="home/title">Welcome!</Node>
      </h1>

      {/* Markdown node with variable interpolation. */}
      <Node uri="home/text.md" url="https://example.com">{md`
        ## Using markdown

        Some text and a [link]({url}).
      `}</Node>

      {/* Image node. */}
      <Node uri="home/image.img" />

      <footer>
        <p>
          {/* Alternate interpolation syntax for convenience. */}
          <Node uri="home/footer" year={new Date().getFullYear()}>
            © [year] 5 Monkeys
          </Node>
        </p>
      </footer>
    </div>
  );
}

// Optional: For server-side rendering (Next.js example).
Page.getInitialProps = async () => {
  await djedi.prefetch();
  const nodes = djedi.track();
  return { nodes };
  // (You also need to call `djedi.addNodes(nodes)` somewhere.)
};

// Inject the admin sidebar, if the user has permission.
djedi.injectAdmin();
```

## Server-side rendering

[**Next.js example**](pages/index.js)

Rendering `<Node>`s automatically fires requests to get node contents (but
batching and caching are used to avoid excessive requests). While this works
great in the browser, it’s not so good for server-side rendering where you
typically only do an initial render. You’d end up with rendering “Loading…” for
all nodes.

The idea is to call `await djedi.prefetch()` before rendering. That will fetch
needed nodes and put them in the cache. Then, when rendering, they’ll all be
available straight away. ([Mostly.](#nodes-behind-conditionals))

The next step is to track which nodes are rendered. Before rendering, call
`const nodes = djedi.track()`. The returned `nodes` is an object **that will be
mutated during rendering.** You need to serialize `nodes` (_after_ rendering)
and pass it along in the HTML response. Then, in the browser, you need to call
`djedi.addNodes(nodes)` to put the rendered nodes into cache again. Otherwise
you’d end up fetching all the nodes again from the browser. You’d also get
“server and client did not match” warnings from React since the actual node
contents would be rendered on the server, but “Loading…” would be rendered in
the browser (during the initial render).

So, how exactly does `djedi.prefetch` know what to fetch? It’s all thanks to the
[Babel] plugin mentioned in [Installation](#installation).

For example, it does the following transformation:

```js
import React from "react";
import { Node } from "djedi-react";

export default function SomeComponent() {
  return <Node uri="uri">default</Node>;
}
```

⬇

```js
var _djedi_uri = "uri",
  _djedi_default = "default";
import { djedi as _djedi } from "djedi-react";

_djedi.reportPrefetchableNode({
  uri: _djedi_uri,
  value: _djedi_default,
});

import React from "react";
import { Node } from "djedi-react";
export default function SomeComponent() {
  return <Node uri={_djedi_uri}>{_djedi_default}</Node>;
}
```

So just by `import`ing that file, djedi-react will know about the node (via the
`djedi.reportPrefetchableNode` call) – even before `<SomeComponent>` is actually
rendered!

The Babel plugin has some constraints, though:

- Nodes with dynamic `uri` (such as `` uri={`store/${storeId}/intro`} ``) are
  not supported. They still work in the browser, but will render “Loading…” on
  the server. You can use `djedi.prefetch({ extra: [...] })` for this case – see
  [djedi.prefetch].
- Nodes with dynamic `children` are not supported either. That’s a
  [bad idea](#variables) anyway.
- You cannot rename `Node` to something else when importing it. It must be
  called exactly `Node`.
- It is assumed that your build system can handle
  `import { djedi } from "djedi-react"`.

There’s a fine detail to keep in mind about the prefetching. Remember how
`import`ing a file is enough to let djedi-react know about the nodes in there?
For an SPA you might end up `import`ing every page and component of your whole
site at startup. That means that calling `djedi.prefetch()` will try to load
every single node of the whole site just to render a single page. The best way
to solve this is to use code splitting ([Next.js] does that by default), which
is good for performance anyway. If that’s not possible for you, you can pass a
filter function to `djedi.prefetch`. For example:

```js
djedi.prefetch({ filter: uri => uri.path.startsWith("home/") });
```

Using Djedi, it is common practice to group nodes by page. For example,
`home/title.txt`, `home/text.md`, `about/title.txt`, `about/text.md`, etc. So
loading all nodes starting with for example `home/` might work out.

### Security

Note that the cache of fetched nodes is global and thus **shared across
different users!**

This means that if you use any kind of _dynamic_ nodes you need to be careful.
There are two things an attacker could do otherwise:

1.  Put a bad default in the cache. Never use dynamic defaults. That’s a
    [bad idea](#variables) anyway.
2.  Fill up the cache with junk. Validate the dynamic parts of URI:s.

For example:

```js
// Make sure to check that `storeId` is an existing store ID before rendering!
// Imagine `storeId` coming from a URL parameter: `?store=12`. Then somebody
// could request `?store=10001`, `?store=10002`, `?store=10003` …
// `?store=999999` progressively filling up the cache with junk "Welcome to our
// store!" nodes.
<Node uri={`store/${storeId}/intro`}>Welcome to our store!</Node>
```

Also be careful with the following methods, since they put nodes into the cache:

- `djedi.prefetch({ extra: [...] })`
- `djedi.get`
- `djedi.getBatched`
- `djedi.addNodes`

## Reference

```js
import { Node, NodeContext, djedi, md } from "djedi-react";
```

- [Node](#node)
- [NodeContext](#nodecontext)
- [djedi](#djedi)
- [md](#md)

### `Node`

This is the main part of the library.

```js
<Node uri="uri" edit={true}>
  default value
</Node>
```

When rendered, it automatically makes a request to fetch the node content.
Batching and caching are used to avoid excessive requests.

If the node already exists in the cache, it is immediately rendered. Otherwise,
`setTimeout` is used to make a request in a couple of milliseconds (see
[djedi.options.batchInterval](#batchinterval)). Requests for other nodes
rendered during that time are batched together. In other words, nodes will be
fetched at most once per `djedi.options.batchInterval` milliseconds.

#### Props

| Prop                       | Type                | Default                                       |
| -------------------------- | ------------------- | --------------------------------------------- |
| [uri](#uri)                | `string`            | **required**                                  |
| [children](#children)      | `string`            | `undefined`                                   |
| [edit](#edit)              | `boolean`           | `true`                                        |
| [render](#render)          | `function`          | [djedi.options.defaultRender](#defaultrender) |
| [...variables](#variables) | `{ [string]: any }` | `{}`                                          |

##### `uri`

`string` **Required**

The node URI.

##### `children`

`string` Default: `undefined`

The default value of the node.

**NOTE:** You may only pass a single string. No nested elements. No JSX
interpolations. This is because nodes are simple URI→string content mappings.
The default value is sent to the backend as a string, and the backend returns a
another string for display.

<!-- prettier-ignore -->
```js
<Node uri="uri">
  This is OK
</Node>
```

The following won’t work, because the `<em>` part is not a string but another
JSX element.

```js
<Node uri="uri">
  This is <em>not</em> OK!
</Node>
```

If you meant to include an `<em>` element in the default value, the best way is
to use the [md](#md) template tag:

<!-- prettier-ignore -->
```js
<Node uri="uri">{md`
  This <em>is</em> OK!
`}</Node>
```

Escaping also works, but might not be very readable:

<!-- prettier-ignore -->
```js
<Node uri="uri">
  This &lt;em&gt;is&lt;/em&gt; OK!
</Node>
```

But **don’t** use a non-tagged template literal, because then you’ll end up with
extraneous whitespace in the default value, which can be especially troublesome
for markdown:

<!-- prettier-ignore -->
```js
// DON’T DO THIS!
<Node uri="uri.md">{`
    This will be a code block in markdown! (The line starts with 4 spaces.)
`}</Node>

// The md tag dedents the value as expected.
<Node uri="uri.md">{md`
    This will be a paragraph in markdown.
`}</Node>

// This also works, because of Babel’s JSX whitespace rules.
<Node uri="uri.md">
    This will be a paragraph in markdown.
</Node>
```

##### `edit`

`boolean` Default: `true`

Whether or not the node should be auto-updated after editing it in the admin
sidebar. Editable nodes are wrapped in a `<span>` while non-editable nodes are
rendered without any enclosing tag. (The name “edit” might be a bit confusing,
but it is inherited from the Django template tags.)

**Note:** It’s not possible to render HTML without a wrapper element in React.
So you can’t do `edit={false}` and expect the node value to be treated as HTML.

A common use-case for using `{% node 'uri' edit=False %}` in Django templates is
to put a node somewhere where you can’t use HTML, such in a `placeholder`
attribute. See the [Search](components/Search.js) example component for how to
do that in React.

##### `render`

`function` Default: [djedi.options.defaultRender](#defaultrender)

The function receives two arguments (the current state and the current language)
and must return a React node (in other words, anything that you can return from
a React component).

See [djedi.options.defaultRender](#defaultrender) for how to implement this
function.

Use cases for this prop include:

- Using a node for something that isn’t an element, such as an attribute. See
  the [Search](components/Search.js) example component for an example.
- Parsing a node value and rendering a custom component. See the
  [Toplist](components/Toplist.js) example component for an example.
- Customizing the loading and error states for a specific node.

##### `...variables`

`{ [string]: any }` Default: `{}`

All remaining props are passed as variables to be interpolated into the node
value.

```js
<Node uri="uri" name="Bob">
  Hello, [name]!
</Node>
```

The above example uses `[name]` rather than `{name}` (like you might be used to
from Django templates), because `{name}` already has another meaning in JSX:

```js
<Node uri="uri" name="Bob">
  {/* ReferenceError: name is not defined */}
  Hello, {name}!
</Node>
```

You _can_ still use the `{name}` syntax. `[name]` is just a convenience to avoid
escaping or using strings. For example:

<!-- prettier-ignore -->
```js
<Node uri="uri" name="Bob">{md`
  Hello, {name}!
`}</Node>
```

`{name}` and `[name]` chunks that you did not pass any value for are left as-is.

The [Babel] plugin mentioned in [Installation](#installation) warns you if
you’ve accidentally used JSX or template string interpolation instead of
variables. That’s an anti-pattern, since it won’t work if the user edits the
node (unlike variable props).

### `NodeContext`

If your site supports multiple languages, you can pass the current language to
`NodeContext.Provider` to have all nodes re-render whenever the language changes
(and get the correct language on the first render). See also
[languages](#languages).

```js
<NodeContext.Provider value={currentLanguage}>
  <App />
</NodeContext.Provider>
```

[**Next.js example**](pages/_app.js)

### `djedi`

The `djedi` object is not React specific and lets you:

- Configure options.
- Load nodes manually, mostly for [server-side rendering].
- Make integrations with other frameworks than React.

This could be extracted into its own package if other framework integrations are
made in the future.

#### Options

You can configure djedi-react by mutating `djedi.options`.

You most likely want to set these:

```js
djedi.options.baseUrl = "/cms";
djedi.options.languages.default = "sv-se";
```

These are the toplevel keys:

- [baseUrl](#baseUrl)
- [batchInterval](#batchinterval)
- [defaultRender](#defaultrender)
- [languages](#languages)
- [uri](#uri-1)

##### `baseUrl`

`string` Default: `"/djedi"`

The base URL to make requests to. By default, requests go to for example
`/djedi/nodes`. By setting `baseUrl: "https://api.example.com/cms"`, requests
would go to `https://api.example.com/cms/nodes` instead.

You probably want to set the `baseUrl` conditionally based on whether the code
runs on the server (an internal network URL) or in the browser (a public URL).

##### `batchInterval`

`number` Default: 10 (milliseconds)

The requests for all `<Node>`s that are rendered within this number of
milliseconds are batched together into a single request. This is to cut down on
the number of requests made to the backend, and to allow the backend to do more
efficient batch database lookups.

Behind the scenes, `<Node>` uses [djedi.getBatched][djedi.getbatched], so
technically speaking this option only configures that method, not `<Node>` by
itself.

Setting `batchInterval: 0` disables batching altogeher, making
[djedi.getBatched] behave just like [djedi.get].

##### `defaultRender`

`function` Default: See below.

The function receives two arguments (the current state and the current language)
and must return anything that the rendering implementation allows (such as a
React node).

Nodes can be in one of three states: `loading`, `error` or `success`. They start
out in the `loading` state, and then progress into either `error` (if fetching
the node content failed) or `success` (if fetching the node content succeeded).
If a node was already in the cache, the `loading` state is skipped, going
straight to `success`.

Here’s the default implementation:

```js
(state, { language }) => {
  // If you override this, you could switch on `language` as well to support
  // multiple languages.
  switch (state.type) {
    case "loading":
      return "Loading…";
    case "error":
      return `Failed to fetch content 😞 (${
        state.error.response != null ? state.error.response.status : -1
      })`;
    case "success":
      return state.content;
    default:
      return null;
  }
};
```

These are the possible states:

- `{ type: "loading" }`: The node is loading.

- `{ type: "error", error: Error }`: Fetching the node failed. The `error`
  property contains an `Error` instance. `error.response` is an [unfetch
  response] with two extra properties:

  - `__input`: object. The sent JSON object.
  - `__output`: string (or any JSON type). The response body if available.

- `{ type: "success", content: string | React.Node }`: Fetching the node
  succeeded. The `content` property is a string containing the fetched value if
  `edit=false` and a React node (a `<span>`) otherwise.

You can use this option to translate the default “Loading” and “Error” messages
to another language, or perhaps render a spinner instead of “Loading…” (maybe
even after a small timeout).

##### `languages`

`object` Default: See below.

The most important part of this option is setting the default language. In the
Django backend, it defaults to the [LANGUAGE_CODE] Django setting, but
djedi-react can’t know about that value so it needs its own defaults.

This is the default value:

```js
{
  default: "en-us",
  additional: [],
}
```

For example, to set the default to `sv-se` and adding `de-de` as an additional
language:

```js
{
  default: "sv-se",
  additional: ["de-de"],
}
```

The above allows passing `de-de` as language to some of the `djedi` methods, as
well as to [NodeContext](#nodecontext). The full list of available languages
must be passed explicitly, to avoid accidentally allowing hackers to fill up the
cache with nodes for bogus languages.

##### `uri`

`object` Default: See below.

The Django backend also allows customizing defaults and separators for the node
URIs. If you do that, you need to make the same customizations in djedi-react.

This is the default value:

```js
({
  defaults: {
    scheme: "i18n",
    namespace: "",
    path: "",
    ext: "txt",
    version: "",
  },
  namespaceByScheme: {
    i18n: "{language}",
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
});
```

In `namespaceByScheme`, the special value `"{language}"` is replaced with the
language passed to some of the `djedi` methods.

#### Common methods

Some of these methods are commonly used in [server-side rendering] scenarios,
but are also useful for avoiding excessive loading indicators.

Interfaces used by several methods:

```js
type Node = {
  uri: string,
  value: string | undefined,
};

type Nodes = {
  [uri: string]: string | undefined,
};
```

`Node` represents a single node, while `Nodes` represents a dict of nodes (a
URI→value mapping).

When `Node` or `Nodes` is used as _input:_

- `uri` may be a partial URI, such as `home/title`.
- `value` is the default value, if any.

When `Node` or `Nodes` is used as _output:_

- `uri` is an absolute URI, such as `i18n://en-us@home/title.txt`.
- `value` is the final value, if any. The final value can be the default value
  (if any), or a value entered by the user in the admin sidebar. It can also be
  transformed (such as markdown→HTML).

##### `djedi.injectAdmin(): Promise<boolean>`

Fetches an HTML snippet for the admin sidebar and appends it to `<body>`.

If the user does not have admin permissions, it does not append anything. The
permission check is session cookie based: Cookies are sent along with the
request, and if a 403 response is received that is treated as not having
permission.

The returned `Promise` resolves to a boolean indicating whether any HTML was
inserted, or rejects with an error if the request fails.

On the server, this method no-ops and always returns `Promise<false>`.

##### `djedi.prefetch({ filter?: Uri => boolean, extra?: Array<Node>, language?: string } = {}): Promise<void>`

Fetches all nodes that [djedi.reportPrefetchableNode] has reported, and adds the
nodes to the cache. Useful for [server-side rendering], and for avoiding
excessive loading indicators.

By calling this before rendering, node contents will be available straight away.
([Mostly.](#nodes-behind-conditionals)) No loading indicators. No re-renders.

You may optionally pass a filter function, that decides which URIs to fetch (by
returning `true` or `false`). The passed URI can look like this:

```js
({
  scheme: "i18n",
  namespace: "en-us",
  path: "some/path/text",
  ext: "txt",
  version: "",
});
```

You can also pass some extra nodes to be prefetched. That’s useful when you have
nodes with dynamic URIs that the Babel plugin cannot automatically do its thing
with. These won’t be matched against the filter function.

```js
function prefetch({ storeId }) {
  return djedi.prefetch({
    filter: uri => uri.path.startsWith("some/path/"),
    extra: [
      { uri: `some/${dynamic}/path`, value: "default" },
      makeStoreInfoNode(storeId),
    ],
  });
}

function makeStoreInfoNode(storeId) {
  return {
    uri: `store/${storeId}/intro`,
    value: md`
      <h1>Welcome!</h1>

      Check out our latest offers.
    `,
  };
}

function Page({ storeId }) {
  const node = makeStoreInfoNode(storeId);
  return <Node uri={node.uri}>{node.value}</Node>;
}
```

By passing in `language`, you can choose which [language](#languages) to use.
Note that the first prefetch with a new language will request _all_ nodes
reported by [djedi.reportPrefetchableNode], not just the ones for the current
page (because djedi-react can’t know which nodes are required for the current
page).

###### Nodes behind conditionals

There’s a scenario where you cannot rely on all nodes on a page being available
straight away after a successful `djedi.prefetch()`.

Here’s an example:

```js
import React from "react";
import { Node } from "djedi-react";
import HelpPopup from "../components/HelpPopup";

// Imagine `djedi.prefetch()`, `djedi.track()` and `djedi.addNodes(nodes)` have
// been called before this renders (as expected).

export default function SomePage() {
  return (
    <div>
      <Node uri="SomePage/intro">Hello!</Node>
      <HelpPopup />
    </div>
  );
}
```

As seen above, the page contains a `<Node>`.

The `<HelpPopup />` component also contains a `<Node>`, for its help text, but
that text isn’t shown until the user hovers a little question mark icon.

The first time this is rendered on the server, neither the page nor
`HelpPopup.js` has run yet, so the `djedi.reportPrefetchableNode()` calls
inserted by the Babel plugin are executed. This way `djedi.prefetch()` knows
about both the page node and the help text node.

But `djedi.track()` will only catch the nodes that were actually rendered. That
is, the page node but not the HelpPopup node. This is to keep things consistent.

The next time this is rendered on the server, the JavaScript files in question
have already been run and as such won’t run again – including the
`djedi.reportPrefetchableNode()` calls. So on a second render the server
wouldn’t know that the `<HelpPopup />` could potentially be used. To avoid
surprises, the same nodes should always be returned to the browser.

`<HelpPopup>` might make DOM measurements to position the popup. In this case it
is not safe to rely on the node content being available straight away – it might
load later. This is a case where using the [render](#render) prop can be
helpful. Using it, you can make the node load earlier and/or update things when
`state.type` changes.

##### `djedi.track(): Object`

Returns an object that will be mutated by all subsequent `djedi.get` and
`djedi.getBatched` calls – until the next `djedi.track` call. Used to track
which nodes are actually rendered during [server-side rendering].

##### `djedi.addNodes(nodes: Nodes): void`

Adds the given nodes to the cache. Usually comes from `djedi.track` and done in
the browser after [server-side rendering].

##### `djedi.setCache(ttl: number): void`

`number` Default: 20e3 (20 seconds) on the server, Infinity in the browser.

The ttl specifies how often to refresh a node. When the ttl has passed the node
is still used, but a request to refresh it is made, so that future lookups get a
fresh value. This means that the cache may serve stale nodes, and nothing is
ever deleted from the cache, only added. The cache must be able to fit all of
your nodes in memory.

The cache needs to work this way due to `djedi.prefetch()`. When the server
starts, `djedi.prefetch` does not know about any nodes of your site. During the
first request, `djedi.reportPrefetchableNode` will be called for the pages and
components imported to render that request. So `djedi.prefetch` will prefetch
those. When somebody visits another page, `djedi.reportPrefetchableNode` will be
called for all new nodes of that page, making `djedi.prefetch` learn about those
as well. `djedi.prefetch` will go through all of the nodes it knows about, but
only request those not in the cache.

If nodes were deleted from the cache when the ttl had passed, `djedi.prefetch()`
could eventually refetch _all_ nodes on your entire site when visiting any page!

When somebody requests a page for the second time, no
`djedi.reportPrefetchableNode` calls will be made. They only run when a module
is imported the first time. So `djedi.prefetch` won’t do anything. The page will
be rendered with whatever nodes are in cache, but all rendered nodes will be
refetched for future use if the ttl has passed.

The goal with the server side rendering is to never render “Loading…”. Any other
text is better, even if it is stale. The only way to achieve this is to make
sure that all nodes always have _something_ in the cache.

Previous versions of djedi-react allowed passing a custom cache to this method.
This has been removed since the caching has gotten the very specific behavior
mentioned above and it’s not clear if it’s an actual use case to provide your
own cache.

#### Less common methods

These methods are useful if you need to manually fetch nodes (rather than using
the `<Node>` component). (Don’t forget that you also can use the
[render](#render) prop.)

##### `djedi.get(node: Node, callback: (Node | Error) => void, options = {}): void`

Fetch a single node. This takes a callback instead of a `Promise`, so the
callback can be invoked synchronously if the node already exists in cache
(`Promise`s are always asynchronous). This is crucial for [server-side
rendering] support.

Note that the callback is called with either a `Node` or an `Error`. You can use
`node instanceof Error` as a check.

Options:

- language: `string`. Which [language](#languages) to use.

##### `djedi.getBatched(node: Node, callback: (Node | Error) => void, options = {}): void`

Like `djedi.get`, but doesn’t make a network request straight away, batching up
with other `djedi.getBatched` requests made during
[djedi.options.batchInterval](#batchinterval)).

##### `djedi.reportPrefetchableNode(node: Node): void`

Registers the passed node as available for [prefetching][djedi.prefetch]. You
most likely won’t use this method directly. Instead, it will be automatically
inserted into your code by a [Babel] plugin. See [server-side rendering].

#### Methods for rendering implementations

These methods are used by the `<Node>` implementation, and would be useful for
other rendering integrations than React. You will probably never call these
yourself.

##### `djedi.reportRenderedNode(node: Node, options = {}): void`

Report that a node has been rendered, so that `window.DJEDI_NODES` and the admin
sidebar can be kept up-to-date.

Options:

- language: `string`. Which [language](#languages) to use.

##### `djedi.reportRemovedNode(uri: string, options = {}): void`

Report that a node has been removed, so that `window.DJEDI_NODES` and the admin
sidebar can be kept up-to-date.

Options:

- language: `string`. Which [language](#languages) to use.

##### `djedi.element(uri: string): object`

Returns an object containing the tag name and attributes for the wrapping
element of an editable node. It is then up to the rendering implementation to
use this information in some way.

```js
({
  tag: "span",
  attributes: {
    "data-i18n": "<full URI>",
  },
});
```

#### Other methods

Might be useful for unit tests, but otherwise you’ll probably won’t need these.

##### `djedi.resetState(): void`

Resets the nodes cache, `window.DJEDI_NODES` and all other state.

##### `djedi.resetOptions(): void`

Resets [djedi.options](#options) back to the defaults.

### `md`

This is a template literal tag. It’s meant to be used for the `children` of
`<Node>` in some cases:

- When your default text contains characters that are annoying to escape in JSX.
- When your default is markdown.
- When you define the default as a string outside `<Node>`, as in the
  [djedi.prefetch] example.

Why tag the template literal with `md`? Because `md` dedents your string, so
that you can format it nicely without worrying about extraneous whitespace
(which can turn text into code blocks in markdown, for example).

```js
<Node uri="home/text.md">{md`
  ## Using markdown

  Some **bold** text.

  <video src="/media/intro.webm"></video>

      function some(code) {
        return code;
      }
`}</Node>

// Equivalent to:

<Node uri="uri">{md`## Using markdown

Some **bold** text.

<video src="/media/intro.webm"></video>

    function some(code) {
      return code;
    }`}</Node>
```

So why is it called `md` and not `dedent`? If you use [Prettier], it will
automatically format the contents of template literal tagged with `md` as
markdown, which is very convenient. This is useful even if the value is plain
text (markdown formatting usually works well there too).

As an extra bonus, the [Babel] plugin mentioned in [Installation](#installation)
optimizes the tag away (`` md`text` `` → `"text"`) when used inside a `<Node>`.

## Django settings

### Cross-domain

If you run your React frontend and your Django backend on different domains, you
need to add some extra settings on the Django side.

Let’s say the React frontend lives on `example.com` while the Django backend
lives on `api.example.com`. Then you need two things:

- [CORS] headers, for example using [django-cors-headers] or nginx. This is to
  allow djedi-react making AJAX requests to fetch nodes. You need to allow `GET`
  and `POST` requests with credentials (cookies) from `example.com`.

- `DJEDI_XSS_DOMAIN = 'example.com'` in your Django settings file. This is to
  allow the admin sidebar iframe to reach into its parent page. This should be a
  common superdomain of the frontend and backend domains. See [document.domain]
  for more information.

- `SESSION_COOKIE_DOMAIN = '.example.com'` in your Django settings file.
  [djedi.injectAdmin] needs to make a request for the admin sidebar, and has to
  send along the session cookie created when logging in to the Django admin on
  `api.example.com`. This makes the cookie available on both domains.

If the two domains do not share the same super domain (such as `site.com` and
`api.com`) you need to set up a proxy server on the React frontend domain. For
example, you could proxy `site.com/djedi` to `api.com/djedi`.

### Prettier and markdown

One of the reasons to use the [md](#md) tag is that it allows [Prettier] to
automatically format your markdown.

Djedi uses [Python-Markdown], which unfortunately handles list items differently
from [CommonMark] \(which Prettier uses): [Python-Markdown/markdown#751].

To work around this issue, you can add the [mdx_truly_sane_lists] extension to
your requirements and configure Djedi to use it:

```py
# https://github.com/Python-Markdown/markdown/issues/751
DJEDI = {"MD": {"EXTENSIONS": ["mdx_truly_sane_lists"]}}
```

## Development

You can either install [Node.js] 10 (with npm 6) or use [docker].

### npm scripts

- `npm start`: Start the [Next.js] example dev server. <http://localhost:3000>
- `npm run watch`: Start [Jest] in watch mode. Outside docker you can use
  `npm run jest -- --watch` instead.
- `npm run eslint`: Run [ESLint] \(including [Prettier]).
- `npm run eslint:fix`: Autofix [ESLint] errors.
- `npm run prettier`: Run [Prettier] for files other than JS.
- `npm run doctoc`: Run [doctoc] on README.md.
- `npm run jest`: Run unit tests.
- `npm run coverage`: Run unit tests with code coverage.
- `npm build`: Compile with [Babel].
- `npm test`: Check that everything works.
- `npm publish`: Publish to [npm], but only if `npm test` passes.

### docker

```bash
# Build:
docker-compse build

# Start containers:
docker-compose up -d

# Run some npm script:
docker-compose exec node npm test

# Run Jest in watch mode:
docker run --rm -it -v /absolute/path/to/djedi-cms/djedi-react:/code -v /code/node_modules djedi-cms_node npm run watch
```

### Directories

- `src/`: Source code.
- `test/` and `__mocks__/`: Tests and mocks.
- `dist/`: Compiled code, built by `npm run build`. This is what is published in
  the npm package.
- `pages/` and `components/`: [Next.js] example app.
- `stub/`: An empty djedi-react package to fool Next.js packages check.

### Notes

#### Test changes in example

If you make changes to the library and want to try them out on
<http://localhost:3000> you need to:

```
# Rebuild:
npm run build
docker-compose exec node npm run build

# Restart:
npm start # But kill old server first :)
docker-compose restart node
```

This is because the example runs against the built code, as an integration test.
If you get tired of rebuilding, you can run the example against the source code
instead:

```
env DJEDI_REACT_DIR=src npm start
env DJEDI_REACT_DIR=src docker-compose up -d node
```

#### docker and permissions

docker runs as root, so files that it creates are owned by root. If you run
docker and then try to run some npm scripts outside docker, they might fail
because of permissions. One solution is to remove the owned-by-root files first:

- `npm start`: `sudo rm -r .next`
- `npm run build`: `sudo rm -r dist`

## License

[BSD-3-Clause](LICENSE)

<!-- prettier-ignore-start -->
[babel]: https://babeljs.io/
[commonmark]: https://commonmark.org/
[cors]: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
[django-cors-headers]: https://github.com/OttoYiu/django-cors-headers
[djedi cms]: https://djedi-cms.org/
[djedi.get]: #djedigetnode-node-callback-node--error--void-options---void
[djedi.getbatched]: #djedigetbatchednode-node-callback-node--error--void-options---void
[djedi.injectadmin]: #djediinjectadmin-promiseboolean
[djedi.prefetch]: #djediprefetch-filter-uri--boolean-extra-arraynode-language-string----promisevoid
[djedi.reportprefetchablenode]: #djedireportprefetchablenodenode-node-void
[docker]: https://www.docker.com/community-edition
[doctoc]: https://github.com/thlorenz/doctoc/
[document.domain]: https://developer.mozilla.org/en-US/docs/Web/API/Document/domain
[eslint]: https://eslint.org/
[jest]: https://jestjs.io/
[language_code]: https://docs.djangoproject.com/en/2.1/ref/settings/#std:setting-LANGUAGE_CODE
[mdx_truly_sane_lists]: https://github.com/radude/mdx_truly_sane_lists
[next.js]: https://nextjs.org/
[node.js]: https://nodejs.org/en/
[npm]: https://www.npmjs.com/
[prettier]: https://prettier.io/
[python-markdown/markdown#751]: https://github.com/Python-Markdown/markdown/issues/751
[python-markdown]: https://python-markdown.github.io/
[react]: https://reactjs.org/
[server-side rendering]: #server-side-rendering
[unfetch response]: https://github.com/developit/unfetch#response-methods-and-attributes
<!-- prettier-ignore-end -->
