### Version 2.0.0 (2018-09-06)

- Fixed: Dedenting is now more intuitive. This is a breaking change. See below
  for more information.
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
