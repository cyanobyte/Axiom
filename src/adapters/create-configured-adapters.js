import { createFakeAgentAdapter } from './providers/create-fake-agent-adapter.js';
import { createOpenAIAgentAdapter } from './providers/create-openai-agent-adapter.js';
import { createLocalWorkspaceAdapter } from './create-local-workspace-adapter.js';
import { createLocalArtifactAdapter } from './create-local-artifact-adapter.js';
import { createLocalShellAdapter } from './create-local-shell-adapter.js';

export function createConfiguredAdapters({ runtimeConfig }) {
  const workspace = createLocalWorkspaceAdapter(runtimeConfig.workspace.root);
  const artifacts = createLocalArtifactAdapter(runtimeConfig.workspace.root, runtimeConfig.artifacts.root);

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

        throw new Error(`Unsupported provider: ${config.provider}`);
      }
    },
    workers: {
      worker() {
        return createLocalShellAdapter();
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
