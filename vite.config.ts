import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { toolsPrerender } from "./scripts/tools-prerender";
export default defineConfig({ plugins: [react(), toolsPrerender()] });
