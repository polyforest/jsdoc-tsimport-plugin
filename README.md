# jsdoc-tsimport-plugin
A JSDoc plugin to support the Typescript import syntax.

[![NPM Package](https://img.shields.io/npm/v/jsdoc-tsimport-plugin)](https://www.npmjs.com/package/jsdoc-tsimport-plugin)
[![NPM Downloads](https://img.shields.io/npm/dw/jsdoc-tsimport-plugin)](https://www.npmtrends.com/jsdoc-tsimport-plugin)

### What is it?

A workaround to VSCode and WebStorm not supporting JSDoc typedef imports.

What JSDocs expects:

```js
/**
 * @type {module:path/to/module~MyTypeDefName}
 */
```

What VSCode expects (as well as Webstorm to a limited degree):

```js
/**
 * @type {typeof import("./path/to/module").MyTypeDefName}
 */
```

This plugin adds hooks to JSDoc that translates the VSCode supported syntax into the JSDoc supported syntax.

### Why?

This allows you to create typedef doclets in a file that can be shared. Just use the typescript-style imports within your doc comments, and then the plugin will translate when you build your jsdocs. This is preferable to adding unused es6/commonjs imports to your code, which may cause unintended side-effects, or fail linting requirements.

### How?

To get started, first install this package with:
```npm install --save-dev jsdoc-tsimport-plugin```

Then in your `jsdoc.conf.json` settings, add the plugin:

```
"plugins": [
  "node_modules/jsdoc-tsimport-plugin/index.js"
]
```

Then, write your doc comment typedef import statements in the typescript style.

```js
/// src/model.js

/** @file Model type definitions */
/** @module */

/**
 * An address model.
 *
 * @typedef {object} Address
 *
 * @property {number} houseNumber The house number.
 * @property {string} street The street.
 * @property {string} city The city.
 * @property {string} state The state.
 * @property {number} zip The zip.
 */
```

```js
/// src/addressView.js

/** @typedef {import('./model.js').Address} Address
```

If everything is working, when you run `jsdoc` you should get a linkable definition for your type.
Example:

| Name  | Type | Description |
| ------------- | ------------- | -------------- |
| shippingAddress  | [module:model~Address](#)  | The shipping address. |

#### ESLint

If you're using ESLint, we recommend turning the built-in jsdoc validation off (it's deprecated anyway), and using [eslint-plugin-jsdoc](https://www.npmjs.com/package/eslint-plugin-jsdoc).
And then set your jsdoc style to 'typescript'.

`.eslintrc.json`
```json
{
  "extends": [
    "plugin:jsdoc/recommended"
  ],
  "plugins": ["jsdoc"],
  "rules": {
    "valid-jsdoc": "off"
  },
  "settings": {
    "jsdoc": {
      "mode": "typescript"
    }
  }
}
```

### Considerations

This will take into account `@module` tags, multiple source directories, and complex paths.

For example:

```js
/// src/path/a/model.js

/** @module call/me/ishmael */

/**
 * Another type definition.
 *
 * @typedef {object} MyType
 * @property {number} foo
 */
```

```js
/// src/path/b/view.js

/**
 * @param {import('../a/model').MyType} data
 */
function show(data) {}
```

In that example the `import('../a/model').MyType` will be replaced in jsdoc with `module:call/me/ishmael~MyType`.

### Known Limitations

In Webstorm, the Typescript import syntax is only partially supported. It will not type hint for local files this way. However, the JSDoc module syntax is entirely unsupported and shows error markers, so this is still an improvement.

### References

This references the issues:
- https://github.com/jsdoc/jsdoc/issues/1537
- https://github.com/jsdoc/jsdoc/issues/1645
- https://github.com/jsdoc/jsdoc/issues/1632


