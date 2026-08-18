import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dggroup.supamobily',
  appName: 'supamobily',
  // Bundled locally now -- mobile-shell/ is a genuinely separate Next.js
  // project (see mobile-shell/next.config.ts) containing just the /agent
  // and /login routes, built with output:'export'. It calls the same
  // Vercel-hosted API routes as before, just as cross-origin fetches
  // instead of same-origin ones (see lib/cors.ts, agent-app.js's API_BASE).
  // The old `server.url` here pointed at the live Vercel deployment
  // directly, meaning every app open re-downloaded the entire screen from
  // the network before anything could render -- removed on purpose.
  webDir: 'mobile-shell/out',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Keep the native splash up until agent-app.js explicitly hides it
    // (after Home has actually painted) -- the default auto-hide timing
    // can hide the splash before the WebView has anything to show yet,
    // producing a blank flash in between.
    SplashScreen: {
      launchAutoHide: false,
    },
  },
};

export default config;
