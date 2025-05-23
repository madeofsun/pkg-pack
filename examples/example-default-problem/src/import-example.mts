import { fixDoubleDefault } from "@pkg-pack/interop";
import a1 from "../external/example.js";
import a2 from "../external/example.mjs";

console.log(a1, a2);
console.log(fixDoubleDefault(a1), fixDoubleDefault(a2));
