// The bundled shell's own origin (capacitor://localhost / https://localhost)
// serves nothing but static files -- every API call goes to the main
// nirvana-agent-oss app on Vercel instead. Single source of truth so it's
// one place to change if the production domain ever moves.
export const API_BASE = "https://nirvana-agent-oss.vercel.app";
