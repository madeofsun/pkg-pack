import { A } from "./some";
import * as AA from "./some";

console.log(A, AA);

import("./some").then((s) => {
  console.log(s.A);
});

export { A } from "./some";
