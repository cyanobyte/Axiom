/**
 * Purpose: Provide deterministic runtime adapters for automated tests.
 * Responsibilities:
 * - Stub workspace, artifact, AI, worker, and checkpoint behavior.
 * - Keep the default test suite free of live provider calls.
 * - Let runtime tests control edge cases through options.
 */

/**
 * Create fake adapters for deterministic runtime tests.
 *
 * @param {object} [options={}]
 * @returns {object}
 */
export function createTestAdapters(options = {}) {
  return {
    workspace: {
      root() {
        return '/tmp/axiom-test';
      },
      async read() {
        return '';
      },
      async write() { },
      async patch() { }
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
      async approval(_id, _spec) {
        return options.checkpointApprovalResult ?? { accepted: true };
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
