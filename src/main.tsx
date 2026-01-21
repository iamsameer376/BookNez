import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";

// Register Service Worker
const updateSW = registerSW({
    onNeedRefresh() {
        // Show a prompt to user to refresh
        if (confirm("New content available. Reload?")) {
            updateSW(true);
        }
    },
});

createRoot(document.getElementById("root")!).render(<App />);
