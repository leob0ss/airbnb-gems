import { createRoot } from "react-dom/client";
import { PostHogProvider } from "@posthog/react";
import App from "./App";
import { initAnalytics, posthog } from "./lib/analytics";
import "./index.css";

initAnalytics();

const root = createRoot(document.getElementById("root")!);
const app = <App />;

root.render(
  import.meta.env.VITE_POSTHOG_PROJECT_TOKEN ? (
    <PostHogProvider client={posthog}>{app}</PostHogProvider>
  ) : (
    app
  ),
);
