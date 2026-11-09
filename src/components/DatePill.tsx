import Pill from "./Pill";
export default function DatePill() {
  const date = new Date();
  const today = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
  });
  return <Pill text={today} isInteractive={false} />;
}
