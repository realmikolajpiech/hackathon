import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
<<<<<<< HEAD
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
=======
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    fs: {
      strict: false,
>>>>>>> 1f40483 (update)
    },
  },
})
