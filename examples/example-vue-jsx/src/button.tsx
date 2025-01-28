import { defineComponent } from "vue";
import styles from "./button.module.css";

export const Button = defineComponent({
  props: {
    text: String,
  },
  setup: (props) => {
    return () => <button class={styles.root}>{props.text}</button>;
  },
});
