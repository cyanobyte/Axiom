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
  }
};

export function getBuildProfile(profileName) {
  return BUILD_PROFILES[profileName];
}
