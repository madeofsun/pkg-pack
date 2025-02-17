console.log(__dirname);
console.log(__filename);
console.log(require("node:url"));
console.log(require.resolve("node:url"));
function some(__dirname: unknown, __filename: unknown, require: unknown) {
  console.log(__dirname);
  console.log(__filename);
  console.log(require);
  console.log(import.meta.dirname);
  console.log(import.meta.filename);
  console.log(import.meta.url);
  console.log(import.meta.resolve("node:url"));
}

export = {
  some,
};
