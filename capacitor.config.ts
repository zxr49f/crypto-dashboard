import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.florianurbanski.vault',
  appName: 'Vault',
  webDir: 'public',
  server: {
    url: 'https://crypto-dashboard-taupe-two.vercel.app/',
    cleartext: true
  }
};

export default config;