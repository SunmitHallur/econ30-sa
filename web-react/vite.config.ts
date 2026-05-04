import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Note: @vitejs/plugin-react v6 (Vite 8) does not run custom Babel plugins, so
// styled-jsx's <style jsx> will NOT compile here. Use CSS Modules (see App.module.css)
// or scaffold Next.js for first-class styled-jsx — see README.md in this folder.
export default defineConfig({
  plugins: [react()],
})
