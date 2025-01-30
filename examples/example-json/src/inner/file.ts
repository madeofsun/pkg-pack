import pkg from "../../package.json";
import pkg2 from "../../../../__fixtures__/package.json";
import some from "../some.json";
import some2 from "../some.json" with { type: 'json' };;

console.log(pkg, pkg2, some, some2);
