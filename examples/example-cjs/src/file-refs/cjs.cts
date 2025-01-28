// replaced with ./some.js
// this case is not possible for now, because some.ts is ESM and it is not possible to require it
// import a = require("./some");
// console.log(a);

// not replaced
export = require("./some");
