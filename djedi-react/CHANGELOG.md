### Version 5.1.0 (2019-01-22)

- Improved: `<ForceNodes>` now accepts objects (and arrays) of nodes.

### Version 5.0.0 (2019-01-11)

- Changed: djedi-react no longer depends on
  [isomorphic-unfetch](https://github.com/developit/unfetch/tree/master/packages/isomorphic-unfetch).
  Instead, you must set `djedi.options.set` to a `fetch`-like function. For
  example, you could still use isomorphic-unfetch:
  `djedi.options.fetch = unfetch`. This lets you use the same `fetch` as the
  rest of your app, and customize requests (such as adding headers). (Breaking
  change.)
- Changed: `state.error` in `defaultRender` and the `render` prop now has a
  slightly different message and properties. `error.status` and
  `error.responseText` have been replaced with `error.response` (which might be
  missing). (Breaking change.)
- Added: `<ForceNodes>`. This component lets you force nodes to load and appear
  in the Djedi sidebar, even if the nodes are not shown usually. Useful for
  error messages.

### Version 4.0.1 (2018-12-10)

- Fixed: Non-default languages now fetch the correct node content when
  server-side rendering.

### Version 4.0.0 (2018-11-01)

- Improved: `<Node>` now uses
  [contextType](https://reactjs.org/docs/context.html#classcontexttype). This
  reduces the nesting visible in the React devtools. This is a breaking change
  since React 16.6.0 or later is now required.

  Before:

  ```js
  <NodeWithContext>
    <NodeContext.Consumer>
      <Node>
        <span>Your text</span>
      </Node>
    </NodeContext.Consumer>
  </NodeWithContext>
  ```

  After:

  ```js
  <Node>
    <span>Your text</span>
  </Node>
  ```

### Version 3.0.2 (2018-10-02)

- Added: react@">=16.3.0" as a peer dependency. At least 16.3.0 has been
  required since 3.0.0 – this makes it explicit.

### Version 3.0.1 (2018-10-01)

- Fixed: There was an error in the new 3.0.0 cache that caused edited nodes
  never to be updated when server-rendered.

### Version 3.0.0 (2018-10-01)

- Fixed: `djedi.prefetch()` can no longer end up requesting all nodes on your
  entire site after a while. The fix was to change how the caching works. This
  means that the cache may now serve stale nodes, and nothing is ever deleted
  from the cache, only added. The cache must be able to fit all of your nodes in
  memory. This is a breaking change.
- Removed: Support for custom caches, since the caching has gotten some very
  specific behavior because of the above fix above and it’s not clear if it’s an
  actual use case to provide your own cache. This is a breaking change.
- Changed: The promise returned by `djedi.prefetch()` no longer resolves to
  anything. Instead you need to do `const nodes = djedi.track()`, which is more
  explicit. This is a breaking change.
- Added: Support for multiple languages, via
  `<NodeContext.Provider value={currentLanguage}>` and
  `djedi.options.languages`. This uses React’s new Context API added in 16.3.0,
  so at least that version of React is now required, which makes this a breaking
  change.
- Added: The `render` prop and `djedi.options.defaultRender` now receive the
  current language, allowing for translating for example “Loading…” into several
  languages.
- Changed: The default language is now set by doing for example
  `djedi.options.languages.default = "sv-se"`, due to the above multiple
  language support. The old way should still work, but is not recommended.
- Improved: The Babel plugin now gives better errors and handles comments in
  some cases.
- Changed: Upgraded to isomorphic-unfetch@^3.0.0.

### Version 2.0.1 (2018-09-12)

- Updated documentation with security advice. No code changes.

### Version 2.0.0 (2018-09-06)

- Fixed: Dedenting is now more intuitive. This is a breaking change. See below
  for more information.
- Changed: Custom caches must now implement a `delete(uri: string): void`
  method. This is a breaking change.
- Fixed: Changes to `<Node>` defaults now update correctly during development.
  As a side effect, rendering the same node URI twice with different defaults no
  longer logs a warning (instead, the newer default replaces the old one).
- Improved: Documentation. More examples, clarifications and notes on quirks.

#### Dedenting

Previously, refactoring this:

<!-- prettier-ignore -->
```js
const node = (
    <Node uri="uri">{md`
        text
    `}</Node>
);
```

… into this:

<!-- prettier-ignore -->
```js
const text = md`
    text
`;
console.log(text);
const node = (
    <Node uri="uri">{text}</Node>
);
```

… was surprising. The `text` variable included the whitespace (as seen with the
`console.log`), but `<Node>` dedented it away. That caused the node to be
rendered differently when it was fetched by `<Node>` versus when `text` was
passed to `djedi.prefetch({ extra: [{ uri: "uri", value: text }] })`. Four
spaces of indentation can cause a code block in markdown.

Version 2.0.0 removes the auto-dedenting in `<Node>`. Instead the `md` tag now
dedents. This makes the above case more intuitive. As a side effect, the `md`
tag now allows interpolation and no longer warns about that, but the Babel
plugin still errors in that case so it doesn’t really matter.

When writing plain JSX text the dedenting in `<Node>` wasn’t needed anyway, due
to Babel’s JSX whitespace rules:

<!-- prettier-ignore -->
```js
<Node uri="uri">
    This is fine!
</Node>
```

In all other cases it is better to use the `md` tag anyway.

The "dedent" package has also been swapped for the "dedent-js" package. The
latter handles JS escapes correctly.

### Version 1.0.0 (2018-08-16)

- No changes, just marking as stable.

### Version 0.1.2 (2018-08-15)

- Fixed: The admin sidebar is now properly updated as nodes come and go on the
  page.

### Version 0.1.1 (2018-08-13)

- Fixed: Nodes with null values returned from the server are now handled
  correctly. This happens when there’s neither a default value nor a database
  value. Previously this resulted in an error being rendered. Now an empty node
  is rendered, as expected.

### Version 0.1.0 (2018-07-03)

- Initial release.
