"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/object-hash/index.js
var require_object_hash = __commonJS({
  "node_modules/object-hash/index.js"(exports2, module2) {
    "use strict";
    var crypto = require("crypto");
    exports2 = module2.exports = objectHash2;
    function objectHash2(object, options) {
      options = applyDefaults(object, options);
      return hash(object, options);
    }
    exports2.sha1 = function(object) {
      return objectHash2(object);
    };
    exports2.keys = function(object) {
      return objectHash2(object, { excludeValues: true, algorithm: "sha1", encoding: "hex" });
    };
    exports2.MD5 = function(object) {
      return objectHash2(object, { algorithm: "md5", encoding: "hex" });
    };
    exports2.keysMD5 = function(object) {
      return objectHash2(object, { algorithm: "md5", encoding: "hex", excludeValues: true });
    };
    var hashes = crypto.getHashes ? crypto.getHashes().slice() : ["sha1", "md5"];
    hashes.push("passthrough");
    var encodings = ["buffer", "hex", "binary", "base64"];
    function applyDefaults(object, sourceOptions) {
      sourceOptions = sourceOptions || {};
      var options = {};
      options.algorithm = sourceOptions.algorithm || "sha1";
      options.encoding = sourceOptions.encoding || "hex";
      options.excludeValues = sourceOptions.excludeValues ? true : false;
      options.algorithm = options.algorithm.toLowerCase();
      options.encoding = options.encoding.toLowerCase();
      options.ignoreUnknown = sourceOptions.ignoreUnknown !== true ? false : true;
      options.respectType = sourceOptions.respectType === false ? false : true;
      options.respectFunctionNames = sourceOptions.respectFunctionNames === false ? false : true;
      options.respectFunctionProperties = sourceOptions.respectFunctionProperties === false ? false : true;
      options.unorderedArrays = sourceOptions.unorderedArrays !== true ? false : true;
      options.unorderedSets = sourceOptions.unorderedSets === false ? false : true;
      options.unorderedObjects = sourceOptions.unorderedObjects === false ? false : true;
      options.replacer = sourceOptions.replacer || void 0;
      options.excludeKeys = sourceOptions.excludeKeys || void 0;
      if (typeof object === "undefined") {
        throw new Error("Object argument required.");
      }
      for (var i = 0; i < hashes.length; ++i) {
        if (hashes[i].toLowerCase() === options.algorithm.toLowerCase()) {
          options.algorithm = hashes[i];
        }
      }
      if (hashes.indexOf(options.algorithm) === -1) {
        throw new Error('Algorithm "' + options.algorithm + '"  not supported. supported values: ' + hashes.join(", "));
      }
      if (encodings.indexOf(options.encoding) === -1 && options.algorithm !== "passthrough") {
        throw new Error('Encoding "' + options.encoding + '"  not supported. supported values: ' + encodings.join(", "));
      }
      return options;
    }
    function isNativeFunction(f) {
      if (typeof f !== "function") {
        return false;
      }
      var exp = /^function\s+\w*\s*\(\s*\)\s*{\s+\[native code\]\s+}$/i;
      return exp.exec(Function.prototype.toString.call(f)) != null;
    }
    function hash(object, options) {
      var hashingStream;
      if (options.algorithm !== "passthrough") {
        hashingStream = crypto.createHash(options.algorithm);
      } else {
        hashingStream = new PassThrough();
      }
      if (typeof hashingStream.write === "undefined") {
        hashingStream.write = hashingStream.update;
        hashingStream.end = hashingStream.update;
      }
      var hasher = typeHasher(options, hashingStream);
      hasher.dispatch(object);
      if (!hashingStream.update) {
        hashingStream.end("");
      }
      if (hashingStream.digest) {
        return hashingStream.digest(options.encoding === "buffer" ? void 0 : options.encoding);
      }
      var buf = hashingStream.read();
      if (options.encoding === "buffer") {
        return buf;
      }
      return buf.toString(options.encoding);
    }
    exports2.writeToStream = function(object, options, stream) {
      if (typeof stream === "undefined") {
        stream = options;
        options = {};
      }
      options = applyDefaults(object, options);
      return typeHasher(options, stream).dispatch(object);
    };
    function typeHasher(options, writeTo, context) {
      context = context || [];
      var write = function(str) {
        if (writeTo.update) {
          return writeTo.update(str, "utf8");
        } else {
          return writeTo.write(str, "utf8");
        }
      };
      return {
        dispatch: function(value) {
          if (options.replacer) {
            value = options.replacer(value);
          }
          var type = typeof value;
          if (value === null) {
            type = "null";
          }
          return this["_" + type](value);
        },
        _object: function(object) {
          var pattern = /\[object (.*)\]/i;
          var objString = Object.prototype.toString.call(object);
          var objType = pattern.exec(objString);
          if (!objType) {
            objType = "unknown:[" + objString + "]";
          } else {
            objType = objType[1];
          }
          objType = objType.toLowerCase();
          var objectNumber = null;
          if ((objectNumber = context.indexOf(object)) >= 0) {
            return this.dispatch("[CIRCULAR:" + objectNumber + "]");
          } else {
            context.push(object);
          }
          if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
            write("buffer:");
            return write(object);
          }
          if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
            if (this["_" + objType]) {
              this["_" + objType](object);
            } else if (options.ignoreUnknown) {
              return write("[" + objType + "]");
            } else {
              throw new Error('Unknown object type "' + objType + '"');
            }
          } else {
            var keys = Object.keys(object);
            if (options.unorderedObjects) {
              keys = keys.sort();
            }
            if (options.respectType !== false && !isNativeFunction(object)) {
              keys.splice(0, 0, "prototype", "__proto__", "constructor");
            }
            if (options.excludeKeys) {
              keys = keys.filter(function(key) {
                return !options.excludeKeys(key);
              });
            }
            write("object:" + keys.length + ":");
            var self = this;
            return keys.forEach(function(key) {
              self.dispatch(key);
              write(":");
              if (!options.excludeValues) {
                self.dispatch(object[key]);
              }
              write(",");
            });
          }
        },
        _array: function(arr, unordered) {
          unordered = typeof unordered !== "undefined" ? unordered : options.unorderedArrays !== false;
          var self = this;
          write("array:" + arr.length + ":");
          if (!unordered || arr.length <= 1) {
            return arr.forEach(function(entry) {
              return self.dispatch(entry);
            });
          }
          var contextAdditions = [];
          var entries = arr.map(function(entry) {
            var strm = new PassThrough();
            var localContext = context.slice();
            var hasher = typeHasher(options, strm, localContext);
            hasher.dispatch(entry);
            contextAdditions = contextAdditions.concat(localContext.slice(context.length));
            return strm.read().toString();
          });
          context = context.concat(contextAdditions);
          entries.sort();
          return this._array(entries, false);
        },
        _date: function(date) {
          return write("date:" + date.toJSON());
        },
        _symbol: function(sym) {
          return write("symbol:" + sym.toString());
        },
        _error: function(err) {
          return write("error:" + err.toString());
        },
        _boolean: function(bool) {
          return write("bool:" + bool.toString());
        },
        _string: function(string) {
          write("string:" + string.length + ":");
          write(string.toString());
        },
        _function: function(fn) {
          write("fn:");
          if (isNativeFunction(fn)) {
            this.dispatch("[native]");
          } else {
            this.dispatch(fn.toString());
          }
          if (options.respectFunctionNames !== false) {
            this.dispatch("function-name:" + String(fn.name));
          }
          if (options.respectFunctionProperties) {
            this._object(fn);
          }
        },
        _number: function(number) {
          return write("number:" + number.toString());
        },
        _xml: function(xml) {
          return write("xml:" + xml.toString());
        },
        _null: function() {
          return write("Null");
        },
        _undefined: function() {
          return write("Undefined");
        },
        _regexp: function(regex) {
          return write("regex:" + regex.toString());
        },
        _uint8array: function(arr) {
          write("uint8array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _uint8clampedarray: function(arr) {
          write("uint8clampedarray:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _int8array: function(arr) {
          write("int8array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _uint16array: function(arr) {
          write("uint16array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _int16array: function(arr) {
          write("int16array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _uint32array: function(arr) {
          write("uint32array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _int32array: function(arr) {
          write("int32array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _float32array: function(arr) {
          write("float32array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _float64array: function(arr) {
          write("float64array:");
          return this.dispatch(Array.prototype.slice.call(arr));
        },
        _arraybuffer: function(arr) {
          write("arraybuffer:");
          return this.dispatch(new Uint8Array(arr));
        },
        _url: function(url) {
          return write("url:" + url.toString(), "utf8");
        },
        _map: function(map) {
          write("map:");
          var arr = Array.from(map);
          return this._array(arr, options.unorderedSets !== false);
        },
        _set: function(set) {
          write("set:");
          var arr = Array.from(set);
          return this._array(arr, options.unorderedSets !== false);
        },
        _file: function(file) {
          write("file:");
          return this.dispatch([file.name, file.size, file.type, file.lastModfied]);
        },
        _blob: function() {
          if (options.ignoreUnknown) {
            return write("[blob]");
          }
          throw Error('Hashing Blob objects is currently not supported\n(see https://github.com/puleos/object-hash/issues/26)\nUse "options.replacer" or "options.ignoreUnknown"\n');
        },
        _domwindow: function() {
          return write("domwindow");
        },
        _bigint: function(number) {
          return write("bigint:" + number.toString());
        },
        /* Node.js standard native objects */
        _process: function() {
          return write("process");
        },
        _timer: function() {
          return write("timer");
        },
        _pipe: function() {
          return write("pipe");
        },
        _tcp: function() {
          return write("tcp");
        },
        _udp: function() {
          return write("udp");
        },
        _tty: function() {
          return write("tty");
        },
        _statwatcher: function() {
          return write("statwatcher");
        },
        _securecontext: function() {
          return write("securecontext");
        },
        _connection: function() {
          return write("connection");
        },
        _zlib: function() {
          return write("zlib");
        },
        _context: function() {
          return write("context");
        },
        _nodescript: function() {
          return write("nodescript");
        },
        _httpparser: function() {
          return write("httpparser");
        },
        _dataview: function() {
          return write("dataview");
        },
        _signal: function() {
          return write("signal");
        },
        _fsevent: function() {
          return write("fsevent");
        },
        _tlswrap: function() {
          return write("tlswrap");
        }
      };
    }
    function PassThrough() {
      return {
        buf: "",
        write: function(b) {
          this.buf += b;
        },
        end: function(b) {
          this.buf += b;
        },
        read: function() {
          return this.buf;
        }
      };
    }
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(src_exports);
var import_coc = require("coc.nvim");
var import_object_hash = __toESM(require_object_hash());
var import_pretty_ts_errors_markdown = require("pretty-ts-errors-markdown");
var NAMESPACE = "pretty-ts-errors";
var TS_NAMESPACE = "tsserver";
async function registerRuntimepath(extensionPath) {
  const { nvim } = import_coc.workspace;
  const rtp = await nvim.getOption("runtimepath");
  const paths = rtp.split(",");
  if (!paths.includes(extensionPath)) {
    await nvim.command(
      `execute 'noa set rtp+='.fnameescape('${extensionPath.replace(
        /'/g,
        "''"
      )}')`
    );
  }
}
function replaceBackticksExceptCodeBlocks(text) {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const backtickRegex = /`([^`]+)`/g;
  const codeBlocks = [];
  const textWithPlaceholders = text.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match);
    return "\0";
  });
  const replacedText = textWithPlaceholders.replace(/</g, "\\<").replace(/>/g, "\\>").replace(backtickRegex, "\x1B[33m$1\x1B[0m");
  const finalText = replacedText.replace(/\0/g, () => codeBlocks.shift() || "");
  return finalText;
}
var error = (str) => {
  return `\x1B[1;31m${str}\x1B[0m`;
};
var warning = (str) => {
  return `\x1B[1;32m${str}\x1B[0m`;
};
var info = (str) => {
  return `\x1B[1;36m${str}\x1B[0m`;
};
var renderType = {
  [import_coc.DiagnosticSeverity.Error]: error,
  [import_coc.DiagnosticSeverity.Warning]: warning,
  [import_coc.DiagnosticSeverity.Information]: info,
  [import_coc.DiagnosticSeverity.Hint]: info
};
var format = (_diagnostics, opt) => {
  const diagnostics = _diagnostics.map((diagnostic) => {
    const formatted = replaceBackticksExceptCodeBlocks(
      (0, import_pretty_ts_errors_markdown.formatDiagnostic)(diagnostic)
    ).split("\n").map((line, index) => {
      if (index === 0) {
        line = renderType[diagnostic.severity || import_coc.DiagnosticSeverity.Error](
          line.substring(3, line.length)
        );
      }
      line = line.replace(
        /(\['?)([^' ]+)('?.+?📄\])/g,
        (_match, _p1, target) => `[${target} \u{1F4C4}]`
      );
      if (opt.showLink === false) {
        line = line.replace(/\[(🔗|🌐)\]\(.*\)/g, "");
      }
      if (opt.codeBlockHighlightType === "prettytserr") {
        line = line.replace(/(?<=(^\s*```))typescript/, "prettytserr");
      } else {
        const match = line.match(/^(\s*)```typescript.*/);
        const spaceCount = (match == null ? void 0 : match[1].length) || 0;
        line = line.replace(
          /(?<=(^\s*```))typescript/,
          `typescript
${" ".repeat(spaceCount)}type Type =`
        );
      }
      return line;
    }).join("\n");
    return {
      ...diagnostic,
      message: `${formatted}

`,
      filetype: "markdown",
      source: NAMESPACE
    };
  });
  return diagnostics;
};
var lastPrettyDiagnostics = {};
var _Mode = class _Mode {
  constructor(value) {
    this.value = value;
    this.value = value;
  }
  showInDiagnostic() {
    return this.value === _Mode.Diagnostic || this.value === _Mode.Both;
  }
  showInHover() {
    return this.value === _Mode.Hover || this.value === _Mode.Both;
  }
};
_Mode.Diagnostic = 0;
_Mode.Hover = 1;
_Mode.Both = 2;
var Mode = _Mode;
async function activate(context) {
  const configuration = import_coc.workspace.getConfiguration(NAMESPACE);
  const isEnable = configuration.get("enable", true);
  const showLink = configuration.get("showLink", false);
  const mode = configuration.get("mode", Mode.Both);
  const codeBlockHighlightType = configuration.get(
    "codeBlockHighlightType",
    "prettytserr"
  );
  const serverName = configuration.get("serverName", TS_NAMESPACE);
  const sourceName = configuration.get("sourceName", serverName) || serverName;
  TS_NAMESPACE = serverName;
  if (!isEnable) {
    return null;
  }
  const modeObj = new Mode(mode);
  const ts = import_coc.services.getService(TS_NAMESPACE);
  if (!ts) {
    console.error(
      `Tsserver not found: serverName '${TS_NAMESPACE}' is not available.`
    );
    return null;
  }
  ts.onServiceReady(() => {
    const collection = import_coc.diagnosticManager.create(NAMESPACE);
    import_coc.diagnosticManager.onDidRefresh(async ({ diagnostics: all, uri }) => {
      if (all.length === 0) {
        lastPrettyDiagnostics[uri] = [];
        modeObj.showInDiagnostic() && collection.set(uri, []);
        return;
      }
      const tsDiagnosticsHashes = [];
      const tsDiagnostics = all.filter((i) => {
        if (i.source === sourceName) {
          const hash = (0, import_object_hash.default)({
            code: i.code,
            range: i.range
          });
          tsDiagnosticsHashes.push(hash);
          return true;
        }
      });
      const existingHashes = [];
      const existing = all.filter((i) => {
        if (i.source === NAMESPACE) {
          const hash = (0, import_object_hash.default)({
            code: i.code,
            range: i.range
          });
          existingHashes.push(hash);
          return true;
        }
      });
      if (tsDiagnostics.length === existing.length && tsDiagnosticsHashes.every((i) => existingHashes.includes(i))) {
        return;
      }
      const formattedDiagnostics = format(tsDiagnostics, {
        showLink,
        codeBlockHighlightType
      });
      setTimeout(() => {
        lastPrettyDiagnostics[uri] = [...formattedDiagnostics];
        modeObj.showInDiagnostic() && collection.set(uri, formattedDiagnostics);
      });
    });
  });
  await registerRuntimepath(context.extensionPath);
  context.subscriptions.push(
    import_coc.languages.registerHoverProvider(
      [
        {
          language: "javascript"
        },
        {
          language: "javascriptreact"
        },
        {
          language: "javascript.jsx"
        },
        {
          language: "typescript"
        },
        {
          language: "typescriptreact"
        },
        {
          language: "typescript.tsx"
        },
        {
          language: "typescript.jsx"
        },
        {
          language: "jsx-tags"
        },
        {
          language: "jsonc"
        },
        {
          language: "vue"
        }
      ],
      {
        provideHover: (_doc, pos) => {
          var _a;
          if (!modeObj.showInHover()) {
            return null;
          }
          const res = (_a = lastPrettyDiagnostics[_doc.uri]) == null ? void 0 : _a.map((d) => {
            if (isPositionInRange(pos, d.range)) {
              return {
                language: "markdown",
                value: d.message
              };
            }
            return null;
          }).filter(Boolean);
          return {
            contents: res
          };
        }
      }
    )
  );
}
function isPositionInRange(pos, range) {
  let flag = true;
  if (pos.line < range.start.line || pos.line > range.end.line)
    flag = false;
  if (pos.line === range.start.line && pos.character < range.start.character)
    flag = false;
  if (pos.line === range.end.line && pos.character > range.end.character)
    flag = false;
  return flag;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate
});
//# sourceMappingURL=index.js.map
