<img alt="Djedi CMS" src="https://djedi-cms.org/_static/djedi-landscape.svg" width="500"/>

# djedi-react

[React] client for [Djedi CMS].

## Installation

```
npm install djedi-react
```

## Usage

Not yet.

## Development

You can either install [Node.js] 10 (with npm 6) or use [docker].

* `npm start`: Start the [Next.js] example dev server.
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
* `dist/`: Compiled code, built by `npm run build`. This is what’s published in
  the npm package.
* `pages/` and `components/`: [Next.js] example app.

[babel]: http://babeljs.io/
[djedi cms]: http://djedi-cms.org/
[docker]: https://www.docker.com/community-edition
[eslint]: https://eslint.org/
[jest]: https://facebook.github.io/
[node.js]: https://nodejs.org/en/
[npm]: https://www.npmjs.com/
[prettier]: https://prettier.io/
[react]: https://reactjs.org/
