import { createRoot } from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import App from "./App.tsx";
import "./index.css";
import { ToastContainer } from "react-toastify";

<ToastContainer />


createRoot(document.getElementById("root")!).render(<App />);
