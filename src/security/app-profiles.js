export const APP_PROFILES = {
  'browser-app-basic': {
    target: 'web-app',
    policy: {
      network: { allowed: ['https'], denied: [] },
      storage: { allowed: ['localStorage'], denied: ['cookies'] },
      secrets: 'none',
      filesystem: 'none',
      shell: 'none'
    }
  },
  'desktop-local-files': {
    target: 'desktop-app',
    policy: {
      network: { allowed: ['https'], denied: [] },
      storage: { allowed: ['appData'], denied: [] },
      secrets: 'os-keychain',
      filesystem: 'user-selected-files',
      shell: 'none'
    }
  },
  'phone-app-basic': {
    target: 'phone-app',
    policy: {
      network: { allowed: ['https'], denied: [] },
      storage: { allowed: ['appStorage'], denied: [] },
      secrets: 'secure-storage',
      filesystem: 'app-sandbox',
      shell: 'none'
    }
  }
};

export function getAppProfile(profileName) {
  return APP_PROFILES[profileName];
}
