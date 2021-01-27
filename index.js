const path = require('path');
const fs = require('fs');
const env = require('jsdoc/env');

const absSrcDirs = env.opts._.map((iSrcDir) => path.join(env.pwd, iSrcDir));

/**
 * @typedef {object} FileEvent
 * @property {string} filename The name of the file.
 * @property {string} source The contents of the file.
 */

/**
 * @typedef {object} DocCommentFoundEvent
 * @property {string} filename The name of the file.
 * @property {string} comment The text of the JSDoc comment.
 * @property {number} lineno The line number.
 * @property {number} columnno The column number.
 */

/**
 * A regex to find typedef imports.
 * Contains two groups, the path and the symbol name.
 */
// eslint-disable-next-line max-len
const typedefRegex = /\/\*\*\s*@typedef\s+{\s*([!?]?)import\(['"]([\.\/\w-\$]*)(?:\.js)?['"]\)\.([\w-\$]*)\}\s*([\w-\$]*)\s*\*\//g;

// eslint-disable-next-line max-len
const importRegex = /(\@\w+\s*){\s*([!?]?)import\(['"]([\.\/\w-\$]*)(?:\.js)?['"]\)\.([\w-\$]*)\}/g;

/**
 * @type {Map<string, Map<string, string>>}
 */
const fileToReplacements = new Map();

/**
 * The beforeParse event is fired before parsing has begun.
 *
 * @param {FileEvent} e The event.
 */
function beforeParse(e) {
  const toReplace = /** @type {Map<string, string>} */ new Map();
  e.source = e.source.replace(typedefRegex,
    (_substring, opts, relImportPath, symbolName, aliasName) => {
      const moduleName = importToModuleId(e.filename, relImportPath);
      toReplace.set(aliasName,
        `${opts}{module:${moduleName}~${symbolName}}`);
      return '';
    });
  // Replace inline imports
  e.source = e.source.replace(importRegex,
    (_substring, tag, opts, relImportPath, symbolName) => {
      const moduleName = importToModuleId(e.filename, relImportPath);
      return `${tag}{${opts}module:${moduleName}~${symbolName}}`;
    });
  fileToReplacements.set(e.filename, toReplace);
};

const moduleNameRegex = /\/\*\*\s*\@module\s+([\w\/]+)\s+\*\//g;

/**
 * Converts a relative path to a module identifier.
 *
 * @param {string} filename The name of the file doing the import.
 * @param {string} relImportPath The relative path of the import.
 * @returns {string} The module id.
 */
function importToModuleId(filename, relImportPath) {
  if (!relImportPath.startsWith('.')) {
    // Not a relative import.
    return relImportPath;
  }
  const absPath = path.normalize(
    path.join(path.dirname(filename), noExtension(relImportPath)));
  // Check if the file has a specified module name, defined by a @module
  // doc comment, otherwise, use the inferred one based on filename.
  const ext = path.extname(relImportPath) || path.extname(filename) || '.js';
  const m = moduleNameRegex.exec(fs.readFileSync(absPath + ext).toString());
  if (m == null) {
    const srcDir = absSrcDirs.find((iSrcDir) => filename.startsWith(iSrcDir));
    return absPath.slice(srcDir.length + 1);
  } else {
    return m[1];
  }
}

/**
 * Strips the extension off of a filename.
 *
 * @param {string} filename A filename with or without an extension.
 * @returns {string} Returns the filename without extension.
 */
function noExtension(filename) {
  return filename.substring(0, filename.length - path.extname(filename).length);
}

/**
 * The jsdocCommentFound event is fired whenever a JSDoc comment is found.
 *
 * @param {DocCommentFoundEvent} e The event.
 */
function jsdocCommentFound(e) {
  fileToReplacements.get(e.filename).forEach((value, key) => {
    // Replace typedef aliases
    e.comment = e.comment.replace(new RegExp(`\{\s*${key}\\s*}`, 'g'), value);
  });
}

exports.handlers = {
  beforeParse: beforeParse,
  jsdocCommentFound: jsdocCommentFound,
};
