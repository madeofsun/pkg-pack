import styles from "./button.module.css";

export const Button = (props: { text: string }) => {
  return <button className={styles.root}>{props.text}</button>;
};
