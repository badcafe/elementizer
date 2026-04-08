import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist-web',
    rollupOptions: {
      output: {
        // Sortie en format IIFE pour usage dans le navigateur sans module
        format: 'iife',
        // Nom global pour accéder via window.MyApp
        name: 'MyApp'
      },
    },
  },
  server: {
    port: 8080,
    open: true,
  },
});
