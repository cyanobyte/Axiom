/**
 * Purpose: Build runtime adapters from validated runtime configuration.
 * Responsibilities:
 * - Create local workspace, artifact, worker, and checkpoint adapters.
 * - Map named agent capabilities to provider-specific adapters.
 * - Keep provider wiring out of authored intent files.
 */
import { createFakeAgentAdapter } from './providers/create-fake-agent-adapter.js';
import { createOpenAIAgentAdapter } from './providers/create-openai-agent-adapter.js';
import { createCodexCliAgentAdapter } from './providers/create-codex-cli-agent-adapter.js';
import { createClaudeCliAgentAdapter } from './providers/create-claude-cli-agent-adapter.js';
import { createLocalWorkspaceAdapter } from './create-local-workspace-adapter.js';
import { createLocalArtifactAdapter } from './create-local-artifact-adapter.js';
import { createLocalShellAdapter } from './create-local-shell-adapter.js';

/**
 * Create a runtime adapter set from validated config.
 *
 * @param {object} options
 * @param {object} options.runtimeConfig
 * @returns {object}
 */
export function createConfiguredAdapters({ runtimeConfig }) {
  const workspace = createLocalWorkspaceAdapter(runtimeConfig.workspace.root);
  const artifacts = createLocalArtifactAdapter(runtimeConfig.workspace.root, runtimeConfig.artifacts.root);
  const shellType = runtimeConfig.workers?.shell?.type;

  return {
    workspace,
    artifacts,
    ai: {
      agent(name) {
        const config = runtimeConfig.agents[name];
        if (!config) {
          throw new Error(`Missing agent config for capability: ${name}`);
        }

        if (config.provider === 'fake') {
          return createFakeAgentAdapter(name, config);
        }

        if (config.provider === 'codex' || config.provider === 'openai') {
          return createOpenAIAgentAdapter(name, config);
        }

        if (config.provider === 'codex-cli') {
          return createCodexCliAgentAdapter(name, config);
        }

        if (config.provider === 'claude-cli') {
          return createClaudeCliAgentAdapter(name, config);
        }

        throw new Error(`Unsupported provider: ${config.provider}`);
      }
    },
    workers: {
      worker() {
        if (shellType === 'local-shell') {
          return createLocalShellAdapter();
        }

        if (shellType === 'fake-shell') {
          return {
            async exec(spec) {
              return {
                ...spec,
                stdout: '',
                stderr: '',
                exitCode: 0
              };
            }
          };
        }

        throw new Error(`Unsupported worker type: ${shellType}`);
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
