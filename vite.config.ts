import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Preview server configuration for production testing
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  },
  
  // Development server configuration
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
