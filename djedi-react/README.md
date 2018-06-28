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

```js
import { Node, djedi, md } from "djedi-react";

function Page() {
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

// For server-side rendering (Next.js example):
Page.getInitialProps = async () => {
  const nodes = await djedi.loadByPrefix(["home/"]);
  return { nodes };
};
```

## Server-side rendering

[**Next.js example**](pages/index.js)

## Reference

Exports:

* [Node](#node)
* [djedi](#djedi)
* [md](#md)

### `Node`

#### Props

| Prop                       | Type               | Default                       |
| -------------------------- | ------------------ | ----------------------------- |
| [uri](#uri)                | string             | **required**                  |
| [children](#children)      | string             | `undefined`                   |
| [edit](#edit)              | boolean            | `true`                        |
| [render](#render)          | function           | `djedi.options.defaultRender` |
| [...variables](#variables) | {[string]: string} | `{}`                          |

##### `uri`

##### `children`

##### `edit`

##### `render`

##### `...variables`

### `djedi`

#### Options

`djedi.options`

#### Common methods

These methods are commonly used in server-side rendering scenarios, but are also
useful for avoiding excessive loading indicators.

##### `djedi.loadByPrefix(prefixes)`

##### `djedi.addNodes(nodes)`

#### Less common methods

These methods are useful if you need to manually fetch nodes (rather than using
the `<Node>` component). (Don’t forget that you also can use the
[render](#render) prop.)

##### `djedi.get(node, callback)`

##### `djedi.getBatched(node, callback)`

##### `djedi.loadMany(nodes)`

#### Methods for rendering impelementations

These methods are used by the `<Node>` implementation, and would be useful for
other rendering integrations than React. You will probably never call these
yourself.

##### `djedi.reportRenderedNode(node)`

##### `djedi.reportRemovedNode(uri)`

##### `djedi.element(uri)`

### `md`

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
[jest]: https://facebook.github.io/
[next.js]: https://nextjs.org/
[node.js]: https://nodejs.org/en/
[npm]: https://www.npmjs.com/
[prettier]: https://prettier.io/
[react]: https://reactjs.org/
