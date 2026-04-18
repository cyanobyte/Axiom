export const BUILD_PROFILES = {
  'node-webapp': {
    docker: {
      image: 'axiom-build-node-webapp:local',
      dockerfile: 'docker/runner/node-webapp/Dockerfile',
      network: 'restricted',
      env: { allow: ['PATH', 'HOME', 'NODE_ENV'] },
      resources: { cpu: 2, memory: '4g' },
      tools: ['node', 'npm']
    },
    vm: {
      virtualbox: {
        packerTemplate: 'profiles/node-webapp/virtualbox.pkr.hcl',
        network: 'restricted',
        env: { allow: ['PATH', 'HOME', 'NODE_ENV'] },
        resources: { cpu: 2, memory: '4g' },
        tools: ['node', 'npm']
      }
    }
  },
  'node-webapp-codex-live': {
    docker: {
      image: 'axiom-build-node-webapp:local',
      dockerfile: 'docker/runner/node-webapp/Dockerfile',
      network: 'bridge',
      env: { allow: ['PATH', 'NODE_ENV'] },
      resources: { cpu: 2, memory: '4g' },
      tools: ['node', 'npm', 'codex'],
      credentialMounts: [
        {
          source: '~/.codex/auth.json',
          target: '/home/node/.codex/auth.json',
          readonly: true
        },
        {
          source: '~/.codex/config.toml',
          target: '/home/node/.codex/config.toml',
          readonly: true
        }
      ]
    }
  }
};

export function getBuildProfile(profileName) {
  return BUILD_PROFILES[profileName];
}
