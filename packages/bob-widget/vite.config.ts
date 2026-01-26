import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import pkg from './package.json';

export default defineConfig({
  define: {
    '__BOB_VERSION__': JSON.stringify(pkg.version),
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  css: {
    postcss: {
      plugins: [],
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'BobWidget',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        // Note: @supabase/supabase-js is now bundled (removed from external)
        // Note: @tanstack/react-query is now bundled for self-contained operation
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
