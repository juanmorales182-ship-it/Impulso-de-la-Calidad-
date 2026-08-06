import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
// Empaqueta todo (JS/CSS) en un único index.html: se puede abrir localmente
// con doble clic o subir tal cual a una biblioteca de documentos de SharePoint.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
})
