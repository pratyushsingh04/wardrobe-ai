import { CLOSET_ENABLED } from "@/lib/db";
import Closet from "./components/Closet";

export default function Home() {
  return <Closet closetEnabled={CLOSET_ENABLED} />;
}
