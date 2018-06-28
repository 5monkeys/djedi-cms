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

* `npm start`: Start [Jest] in watch mode.
  You can also run `npm run jest -- --watch`.
* `npm run lint`: Run [ESLint] \(including [Prettier]).
* `npm run lint:fix`: Autofix [ESLint] errors.
* `npm run jest`: Run unit tests.
* `npm run coverage`: Run unit tests with code coverage.
* `npm build`: Compile with [Babel].
* `npm test`: Check that everything works.
* `npm publish`: Publish to [npm], but only if `npm test` passes.

For docker:

```bash
docker-compose up -d
docker attach --detach-keys="ctrl-d" "$(docker-compose ps -q node)"
# Now press `a`.
# Press ctrl-d to exit.
# To run some npm script:
docker-compose exec node npm test
```

[babel]: http://babeljs.io/
[djedi cms]: http://djedi-cms.org/
[docker]: https://www.docker.com/community-edition
[eslint]: https://eslint.org/
[jest]: https://facebook.github.io/
[node.js]: https://nodejs.org/en/
[npm]: https://www.npmjs.com/
[prettier]: https://prettier.io/
[react]: https://reactjs.org/
