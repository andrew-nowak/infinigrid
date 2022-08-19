import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const common = { plugins: [react()] };

  if (mode === "pages") {
    return { ...common, base: "/infinigrid/" };
  }

  return common;
});
