export function createTestAdapters() {
  return {
    workspace: {
      root() {
        return '/tmp/axiom-test';
      },
      async read() {
        return '';
      },
      async write() {},
      async patch() {}
    },
    artifacts: {
      async read() {
        return null;
      }
    },
    ai: {
      agent() {
        return {
          async run(input) {
            return input;
          }
        };
      }
    },
    workers: {
      worker() {
        return {
          async exec(spec) {
            return spec;
          }
        };
      }
    },
    verify: {
      async intent() {
        return { status: 'passed' };
      },
      async outcome() {
        return { status: 'passed' };
      }
    },
    checkpoint: {
      async approval() {
        return { accepted: true };
      },
      async choice() {
        return { value: null };
      },
      async input() {
        return { value: null };
      }
    }
  };
}
