import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// base './' + HashRouter => works on any GitHub Pages path without 404 tricks
export default defineConfig({ base: './', plugins: [react(), tailwindcss()] })
