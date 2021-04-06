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
 * A regex to capture all doc comments.
 */
const docCommentsRegex = /\/\*\*\s*(?:[^\*]|(?:\*(?!\/)))*\*\//g;

/**
 * Find the module name.
 */
const moduleNameRegex = /@module\s+([\w\/]+)?/;

/**
 * Finds typedefs
 */
const typedefRegex = /@typedef\s*(?:\{[^}]*\})\s*([\w-\$]*)/g;


/**
 * Finds a ts import.
 */
const importRegex = /import\(['"](\@?[\.\/_a-zA-Z0-9-\$]*)(?:\.js)?['"]\)\.?([_a-zA-Z0-9-\$]*)?/g;

const typeRegex = /\{[^}]*\}/g;

const identifiers = /([\w-\$\.]+)/g;

/**
 * @typedef {object} FileInfo
 * @property {string} filename
 * @property {?string} moduleId
 * @property {string[]} typedefs
 */

/**
 * A map of filenames to module ids.
 *
 * @type {Map<string, FileInfo>}
 */
const fileInfos = new Map();

/**
 * A map of moduleId to type definition ids.
 *
 * @type {Map<string, Set<string>>}
 */
const moduleToTypeDefs = new Map();

/**
 * Retrieves and caches file information for this plugin.
 *
 * @param {string} filename
 * @param {?string} source
 * @returns {!FileInfo}
 */
function getFileInfo(filename, source = null) {
  const filenameNor = path.normalize(filename);
  if (fileInfos.has(filenameNor)) return fileInfos.get(filenameNor);
  const fileInfo = /** @type {FileInfo} */ ({
    moduleId: null, typedefs: [], filename: filenameNor,
  });

  const s = source || ((fs.existsSync(filenameNor)) ?
  fs.readFileSync(filenameNor).toString() : '');
  s.replace(docCommentsRegex, (comment) => {
    if (!fileInfo.moduleId) {
      // Searches for @module doc comment
      const moduleNameMatch = comment.match(moduleNameRegex);
      if (moduleNameMatch) {
        if (!moduleNameMatch[1]) {
          // @module tag with no module name; calculate the implicit module id.
          const srcDir = absSrcDirs.find((iSrcDir) =>
            filenameNor.startsWith(iSrcDir));
          fileInfo.moduleId = noExtension(filenameNor)
            .slice(srcDir.length + 1).replace(/\\/g, '/');
        } else {
          fileInfo.moduleId = moduleNameMatch[1];
        }
      }
    }
    // Add all typedefs within the file.
    comment.replace(typedefRegex, (_substr, defName) => {
      fileInfo.typedefs.push(defName);
      return '';
    });
    return '';
  });
  if (!fileInfo.moduleId) {
    fileInfo.moduleId = '';
  }

  // Keep a list of typedefs per module.
  if (!moduleToTypeDefs.has(fileInfo.moduleId)) {
    moduleToTypeDefs.set(fileInfo.moduleId, new Set());
  }
  const typeDefsSet = moduleToTypeDefs.get(fileInfo.moduleId);
  fileInfo.typedefs.forEach((item) => {
    typeDefsSet.add(item);
  });

  fileInfos.set(filenameNor, fileInfo);
  return fileInfo;
}


/**
 * The beforeParse event is fired before parsing has begun.
 *
 * @param {FileEvent} e The event.
 */
function beforeParse(e) {
  getFileInfo(e.filename, e.source);

  // Find all doc comments (unfortunately needs to be done here and not
  // in jsDocCommentFound or there will be errors)
  e.source = e.source.replace(docCommentsRegex,
    (substring) => {
      return substring.replace(importRegex,
        (_substring2, relImportPath, symbolName) => {
        const moduleId = getModuleId(e.filename, relImportPath);
        return (moduleId) ? `module:${moduleId}${symbolName?"~"+symbolName:""}` : symbolName;
      });
    });
};

/**
 * Converts a relative path to a module identifier.
 *
 * @param {string} filename The normalized path of the file doing the import.
 * @param {string} relImportPath The import string.
 * @returns {string} The module id.
 */
function getModuleId(filename, relImportPath) {
  if (!relImportPath.startsWith('.')) {
    // Not a relative import.
    return relImportPath;
  }

  const p = relPath(filename, relImportPath);
  const absPath = inferExtension(p);
  return getFileInfo(absPath).moduleId;
}

/**
 * Returns the normalized, absolute path of `relative` to `root.
 *
 * @param {string} root
 * @param {string} relative
 * @returns {string}
 */
function relPath(root, relative) {
  if (path.isAbsolute(relative)) return relative;
  return path.normalize(
    path.join(path.dirname(root), relative));
}

/**
 * Given a filename, if there is no extension, scan the files for the
 * most likely match.
 *
 * @param {string} filename The filename with or without an
 * extension to resolve.
 * @returns {string} The path to the resolved file.
 */
function inferExtension(filename) {
  const filenameNor = path.normalize(filename);
  const ext = path.extname(filenameNor);
  if (ext && fs.existsSync(filename)) return ext;
  const files = fs.readdirSync(path.dirname(filenameNor));

  const name = path.basename(filenameNor);
  const foundFile = files.find((iFile) => {
    if (noExtension(iFile) == name) {
      return true;
    }
  });
  if (foundFile === undefined) return filename;
  return path.join(path.dirname(filenameNor), foundFile);
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
 * All file infos are now populated; replace typedef symbols with their
 * module counterparts.
 *
 * @param {DocCommentFoundEvent} e The event.
 */
function jsdocCommentFound(e) {
  const fileInfo = getFileInfo(e.filename);
  const typeDefsSet = moduleToTypeDefs.get(fileInfo.moduleId);
  if (!typeDefsSet) return;

  e.comment = e.comment.replace(typeRegex, (typeExpr) => {
    return typeExpr.replace(identifiers, (identifier) => {
      return (fileInfo.moduleId && typeDefsSet.has(identifier)) ?
        `module:${fileInfo.moduleId}~${identifier}` :
        identifier;
    });
  });
}


exports.handlers = {
  beforeParse: beforeParse,
  jsdocCommentFound: jsdocCommentFound,
};
