import { createRoot } from "react-dom/client";
import { MotionGlobalConfig } from "framer-motion";
import { REDUCED } from "./utils/animate";
import App from "./App";

if (REDUCED) {
  MotionGlobalConfig.skipAnimations = true;
  document.documentElement.classList.add("estatico");
}

createRoot(document.getElementById("root")).render(<App />);
