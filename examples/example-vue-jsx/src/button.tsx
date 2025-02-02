import { defineComponent } from "vue";
import styles from "./button.module.css";

/**
 * @internal
 * */
type SomeReturns = {
  a: number;
};

/**
 * @public
 * */
export function some() {
  return {} as SomeReturns;
}

/**
 * @public
 * */
export const Button = defineComponent({
  props: {
    text: String,
  },
  setup: (props) => {
    return () => <button class={styles.root}>{props.text}</button>;
  },
});
