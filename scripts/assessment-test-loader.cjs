// Test-only TypeScript loader for Node 20. No emitted files or app configuration changes.
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, parent, ...args) {
  if (name === 'server-only') return __filename;
  if (name.startsWith('@/')) name = path.join(process.cwd(), 'src', name.slice(2));
  return resolve.call(this, name, parent, ...args);
};
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8').replace(/import\.meta\.url/g, JSON.stringify(require('node:url').pathToFileURL(filename).href));
    const result = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    }, fileName: filename });
    module._compile(result.outputText, filename);
  };
}
