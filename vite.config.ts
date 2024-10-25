import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { remix } from '@remix-run/vite';

export default defineConfig({
  plugins: [react(), remix()],
});
