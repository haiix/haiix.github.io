/** @type {import('vite').UserConfig} */
export default {
  base: '',
  resolve: {
    alias: [
      {
        find: 'acorn',
        replacement: 'https://cdn.jsdelivr.net/npm/acorn@8.15.0/+esm',
      },
      {
        find: 'typescript',
        replacement: 'https://cdn.jsdelivr.net/npm/typescript@5.9.2/+esm',
      },
      {
        find: 'source-map-js',
        replacement: 'https://cdn.jsdelivr.net/npm/source-map-js@1.2.1/+esm',
      },
    ],
  },
  build: { modulePreload: { polyfill: false }, outDir: '../' },
};
