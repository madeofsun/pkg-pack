import pkg from "../../package.json";
import pkg2 from "../../../../some/package.json";
import some from "../some.json";
import some2 from "../some.json" with { type: 'json' };;

console.log(pkg, pkg2, some, some2);
