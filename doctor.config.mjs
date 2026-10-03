export default {
  ignore: {
    // Scan workshop sources; bundles and installed/imported tools have their own owners.
    files: [
      '**/*.bundle.js',
      'index.html',
      'node_modules/**',
      'tools/**',
      '.agents/**',
      '.codex/**',
      '.desloppify/**',
    ],
  },
};
