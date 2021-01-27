# jsdoc-tsimport-plugin
A JSDoc plugin to support the Typescript import syntax.

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

This plugin adds hooks to jsdoc that translates the VSCode supported syntax into the JSDoc supported syntax.

### Why?

This allows you to create typedef doclets in a file that can be shared. Just use the typescript-style imports within your doc comments, and then the plugin will translate when you build your jsdocs. This is preferable to adding unused es6/commonjs imports to your code, which may cause unintended side-effects, or fail linting requirements.

```
// src/model.js
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

```
// src/addressView.js

/** @typedef {import(./model.js).Address} Address
```

### How?

To get started, first install this package with:
```npm install --save-dev jsdoc-tsimport-plugin```

Then in your `jsdoc.conf.json` settings, add the plugin:

```
"plugins": [
  "node_modules/jsdoc-tsimport-plugin/index.js"
]
```

If everything is working, when you run jsdoc you should get a linkable definition for your type.

| Name  | Type | Description |
| ------------- | ------------- | -------------- |
| data  | [module:model~ParticleEffectVo](#)  | The model used to construct this particle effect. |


