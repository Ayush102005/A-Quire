import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // amazon-cognito-identity-js expects Node's `global`; polyfill for browser
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['amazon-cognito-identity-js'],
    exclude: ['@mediapipe/face_mesh', '@mediapipe/camera_utils', '@mediapipe/tasks-vision'],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
