<img alt="Djedi CMS" src="https://djedi-cms.org/_static/djedi-landscape.svg" width="500"/>

# djedi-react

[React] client for [Djedi CMS].

## Installation

```
npm install djedi-react react react-dom
```

## Browser support

All the latest browsers plus Internet Explorer 11 (which requires a `Promise`
polyfill).

## Usage

The library is designed to mimic the Django template tags as closely as
possible. In Django world there are two tags, `node` and `blocknode`:

```django
{% node 'page/title.txt' default='Djedi' %}

{% blocknode 'page/body.md' %}
    ## I'm a djedi apprentice
    This is fun!
{% endblocknode %}
```

In React world, there’s no need for two tags. (`blocknode` can do everything
that `node` can do. `node` is just a shortcut for simple nodes.) So
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
      <Node uri="home/text.md" url="http://example.com">{md`
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

// For server-side rendering (Next.js example).
Page.getInitialProps = async () => {
  const nodes = await djedi.loadByPrefix(["home/"]);
  return { nodes };
};
```

## Server-side rendering

[**Next.js example**](pages/index.js)

Rendering `<Node>`s automatically fires requests to get node contents (but
batching and caching are used to avoid excessive requests). While this works
great in the browser, it’s not so good for server-side rendering where you
typically only do an initial render. You’d end up with rendering “Loading…” for
all nodes.

Using Djedi, it is common practice to group nodes by page. For example,
`home/title.txt`, `home/text.md`, `about/title.txt`, `about/text.md`, etc. The
server-side rendering solution exploits this fact.

The idea is to call `await djedi.loadByPrefix(["home/"])` before rendering. That
will fetch all nodes starting with `home/` and put them in the cache. Then, when
rendering, they’ll all be available to render straight away.

This is a low-tech way to solve the problem in a good-enough manner.

There’s one piece of the puzzle left, though. `djedi.loadByPrefix` also returns
the nodes it fetched: `const nodes = await djedi.loadByPrefix(["home/"])`. You
need to serialize those and pass them along in the HTML response. Then, in the
browser, you need to call `djedi.addNodes(nodes)` to put them into cache again.
Otherwise you’d end up fetching all the nodes again from the browser. You’d also
get “server and client did not match” warnings from React since the actual node
contents would be rendered on the server, but “Loading…” would be rendered in
the browser (during the initial render).

## Reference

```js
import { Node, djedi, md } from "djedi-react";
```

* [Node](#node)
* [djedi](#djedi)
* [md](#md)

### `Node`

This is the main part of the library.

```js
<Node uri="uri" edit={true}>
  default value
</Node>
```

When rendered, it automatically makes a request to fetch the node content. To
avoid excessive requests batching and caching are used.

If the node already exists in the cache, it is immediately rendered. Otherwise,
`setTimeout` is used to make a request in a couple of milliseconds (see
[djedi.options.batchInterval](#batchinterval)). Requests for other nodes
rendered during that time are batched together. In other words, nodes will be
fetched at most once per `djedi.options.batchInterval` ms.

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

```js
<Node uri="uri">This is OK</Node>
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
  This is &lt;em&gt;not&lt;/em&gt; OK!
</Node>
```

Finally, the default value is dedented, so that you can format it nicely without worrying about extraneous whitespace.

```js
<Node uri="uri">{md`
  Some text.

      function some(code) {
        return code;
      }
`}</Node>

// Equivalent to:

<Node uri="uri">{md`Some text.

    function some(code) {
      return code;
    }`}</Node>
```

##### `edit`

`boolean` Default: `true`

Whether or not the node should be editable in the admin sidebar. Editable nodes
are wrapped in a `<span>` while non-editable nodes are rendered without any
enclosing tag.

**Note:** It’s not possible to render HTML without a wrapper element in React.
So you can’t do `edit={false}` and expect the node value to be treated as HTML.

A common use-case for using `{% node 'uri' edit=False %}` in Django templates is
to put a node somewhere where you can't use HTML, such in a `placeholder`
attribute. See the [Search](components/Search.js) example component for how to
do that in React.

##### `render`

`function` Default: [djedi.options.defaultRender](#defaultrender)

The function receives one argument (the current state) and must return a React
node (in other words, anything that you can return from a React component).

See [djedi.options.defaultRender](#defaultrender) for how to implement this
function.

See the [Search](components/Search.js) example component for a use case for this
prop. You probably won't need this most of the time.

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

### `djedi`

The `djedi` object is not React specific and lets you:

* Configure options.
* Load nodes manually, mostly for server-side rendering.
* Make integrations with other frameworks than React.

#### Options

You can configure djedi-react by mutating `djedi.options`. It has the following
toplevel keys:

* [baseUrl](#baseUrl)
* [batchInterval](#batchInterval)
* [defaultRender](#defaultrender)
* [uri](#uri)

##### `baseUrl`

`string` Default: `""`

The base URL to make requests to. By default, requests go to for example
`/djedi/load_many`. By setting `baseUrl: "https://api.example.com/internal"`,
requests would go to `https://api.example.com/internal/djedi/load_many` instead.

You probably want to set the `baseUrl` conditionally based on whether the code
runs on the server (an internal network URL) on in the browser (a public URL).

##### `batchInterval`

`number` Default: 50 (milliseconds)

The requests for all `<Node>`s that are rendered within this number of
milliseconds are batched together into a single request. This is to cut down on
the number of requests made to the backend, and to allow the backend to do more
efficient batch database lookups.

Behind the scenes, `<Node>` uses [djedi.getBatched](#djedigetbatchednode-node-callback-node--error--void-void), so
technically speaking this option only configures that method, not `<Node>` by
itself.

Setting `batchInterval: 0` disables batching altogeher, making
[djedi.getBatched](#djedigetbatchednode-node-callback-node--error--void-void) behave just like
[djedi.get](#djedigetnode-node-callback-node--error--void-void).

##### `defaultRender`

`function` Default: See below.

The function receives one argument (the current state) and must return anything
that the rendering implementation allows (such as a React node).

Nodes can be in one of three states: `loading`, `error` or `success`. They start
out in the `loading` state, and then progress into either `error` (if fetching
the node content failed) or `success` (if fetching the node content succeeded).
If a node was already in the cache, the `loading` state is skipped, going
straight to `success`.

The function receives the current state and decides what to render. Here's the
default implementation:

```js
state => {
  switch (state.type) {
    case "loading":
      return "Loading…";
    case "error":
      return `Failed to fetch content 😞 (${state.error.status})`;
    case "success":
      return state.content;
    default:
      return null;
  }
};
```

These are the possible states:

* `{ type: "loading" }`: The node is loading.

* `{ type: "error", error: Error }`: Fetching the node failed. The `error`
  property contains an `Error` instance with the following extra properties:

  * `status`: number. The status code of the response. If there was no response,
    it's `-1`. If the response didn't contain the requested node, it's `1404`.
  * `responseText`: string. The response as text if available, otherwise the
    empty string.

* `{ type: "success", content: string | React.Node }`: Fetching the node
  succeeded. The `content` property is a string containing the fetched value if
  `edit=false` and a React node (a `<span>`) otherwise.

You can use this option to translate the default "Loading" and "Error" messages
to another language, or perhaps render a spinner instead of "Loading" (maybe
even after a small timeout).

##### `uri`

`object` Default: See below.

The backend allows customizing defaults and separators for the node URIs. If you
do, you need to make the same customizations in djedi-react.

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
});
```

#### Common methods

These methods are commonly used in server-side rendering scenarios, but are also
useful for avoiding excessive loading indicators.

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

* `uri` may be partial URI, such as `home/title`.
* `value` is the default value, if any.

When `Node` or `Nodes` is used as _output:_

* `uri` is an absolute URI, such as `i18n://en-us@home/title.txt`.
* `value` is the final value, and supposed to always exist.

##### `djedi.loadByPrefix(prefixes: Array<string>): Promise<Nodes>`

Returns all nodes that match the given prefixes, such as `["home/", "en-us@about/"]`. Useful for server-side rendering, or for avoiding excessive
loading indicators.

##### `djedi.addNodes(nodes: Nodes): void`

Adds the given nodes to the cache. Usually comes from `djedi.loadByPrefix` and
done in the browser after server-side rendering.

#### Less common methods

These methods are useful if you need to manually fetch nodes (rather than using
the `<Node>` component). (Don’t forget that you also can use the
[render](#render) prop.)

##### `djedi.get(node: Node, callback: (Node | Error) => void): void`

Fetch a single node. This takes a callback instead of a `Promise`, so the callback can be invoked synchronously if the node already exists in cache (`Promise`s are always asynchronous). This is crucial for server-side rendering support.

Note that the callback is called with either a `Node` or an `Error`. You can use
`node instanceof Error` as a check.

##### `djedi.getBatched(node: Node, callback: (Node | Error) => void): void`

Like `djedi.get`, but doesn't make a network request straight away, batching up
with other `djedi.getBatched` requests made during
[djedi.options.batchInterval](#batchinterval)).

##### `djedi.loadMany(nodes: Nodes): Promise<Nodes>`

Fetches many nodes at once. Mainly used internally by other methods.

Note that this never hits the cache – it makes a network request straight away.

#### Methods for rendering implementations

These methods are used by the `<Node>` implementation, and would be useful for
other rendering integrations than React. You will probably never call these
yourself.

##### `djedi.reportRenderedNode(node: Node): void`

Report that a node has been rendered, so that `window.DJEDI_NODES` can be kept
up-to-date.

##### `djedi.reportRemovedNode(uri: string): void`

Report that a node has been removed, so that `window.DJEDI_NODES` can be kept
up-to-date.

##### `djedi.element(uri: string): object`

Returns an object containing the tag name and attributes for the wrapping element of an editable node. It is then up to the rendering implementation to use this information in some way.

```js
({
  tag: "span",
  attributes: {
    "data-i18n": "<full URI>",
  },
});
```

#### Other methods

Might be useful for unit tests, but otherwise you'll probably won't need these.

##### `djedi.resetOptions(): void`

Resets [djedi.options](#options) back to the defaults.

##### `djedi.resetNodes(): void`

Resets the nodes cache.

### `md`

This is a template literal tag. It's meant to be used for the `children` of `<Node>` in some cases:

* When your default text contains characters that are annoying to escape in JSX.
* When your default is markdown.

```js
<Node uri="home/text.md">{md`
  ## Using markdown

  Some **bold** text.

  <video src="/media/intro.webm"></video>
`}</Node>
```

Now, what does the tag actually do? Not much to be honest. The above example
works exactly the same without the `md` tag. But there are some benefits:

* The `md` tag warns you if you use interpolation (`${variable}`) in the
  template literal. That's an anti-pattern, since it won't work if the user
  edits the node. Use [variables](#variables) instead.

* If you use [Prettier], it will automatically format the contents of the
  template literal as markdown, which is very convenient. This is useful even if
  the value is plain text (markdown formatting usually works well there too).

## Development

You can either install [Node.js] 10 (with npm 6) or use [docker].

* `npm start`: Start the [Next.js] example dev server. <http://localhost:3000>
* `npm run watch`: Start [Jest] in watch mode.
  Outside docker you can use `npm run jest -- --watch` instead.
* `npm run lint`: Run [ESLint] \(including [Prettier]).
* `npm run lint:fix`: Autofix [ESLint] errors.
* `npm run jest`: Run unit tests.
* `npm run coverage`: Run unit tests with code coverage.
* `npm build`: Compile with [Babel].
* `npm test`: Check that everything works.
* `npm publish`: Publish to [npm], but only if `npm test` passes.

For docker:

```bash
# Build:
docker-compse build

# Start containers:
docker-compose up -d

# Run some npm script:
docker-compose exec node npm test

# Run Jest in watch mode:
docker run --rm -it -v /absolute/path/to/djedi-cms/djedi-react:/code -v /code/node_modules djedi-react run watch
```

Directories:

* `src/`: Source code.
* `test/` and `__mocks__/`: Tests and mocks.
* `dist/`: Compiled code, built by `npm run build`. This is what is published in
  the npm package.
* `pages/` and `components/`: [Next.js] example app.

## License

[BSD-3-Clause](LICENSE)

[babel]: http://babeljs.io/
[djedi cms]: http://djedi-cms.org/
[docker]: https://www.docker.com/community-edition
[eslint]: https://eslint.org/
[jest]: http://jestjs.io/
[next.js]: https://nextjs.org/
[node.js]: https://nodejs.org/en/
[npm]: https://www.npmjs.com/
[prettier]: https://prettier.io/
[react]: https://reactjs.org/
