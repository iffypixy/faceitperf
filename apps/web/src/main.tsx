import {createRoot} from "react-dom/client";
import {App} from "./app";

import "./index.css";

const root = document.getElementById("root")!;

createRoot(root).render(<App />);
