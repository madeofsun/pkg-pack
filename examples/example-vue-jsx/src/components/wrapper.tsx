import { defineComponent } from "vue";
import { Button } from "./button";

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
