export default {
  ignore: {
    // Scan workshop sources; dependencies and installed or imported tools have their own owners.
    files: [
      'dist/**',
      'node_modules/**',
      'tools/**',
      '.agents/**',
      '.claude/**',
      '.codex/**',
      '.desloppify/**',
    ],
  },
};
