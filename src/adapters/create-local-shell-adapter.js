export function createLocalShellAdapter() {
  return {
    async exec(spec) {
      return {
        ...spec,
        exitCode: 0
      };
    }
  };
}
