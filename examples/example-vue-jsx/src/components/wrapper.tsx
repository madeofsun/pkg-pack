import { getEsmDefault } from "@pkg-pack/interop";
import * as _tippy from "tippy.js";
import _tippyD from "tippy.js";
import mitt from "mitt";
import { defineComponent } from "vue";
import { Button } from "./button";

const tippy1 = getEsmDefault(_tippy);
const tippy2 = getEsmDefault(_tippyD);
// const tippy3 = getEsmDefault(_tippyD.default);

console.log(tippy1 === tippy2);
console.log(mitt.name);

export const Wrapper = defineComponent({
  name: "Wrapper",
  setup() {
    return () => (
      <div>
        <Button text={"qwe"}></Button>
      </div>
    );
  },
});
