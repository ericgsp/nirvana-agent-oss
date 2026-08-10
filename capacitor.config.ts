import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dggroup.supamobily',
  appName: 'supamobily',
  webDir: 'out',
  server: {
    url: 'https://nirvana-agent-oss.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
