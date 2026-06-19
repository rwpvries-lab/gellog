import { execSync } from "node:child_process";

// Capacitor native patches (e.g. apple-sign-in iPad anchor) are only needed for
// local/Xcode iOS builds. Vercel restores cached node_modules, so re-applying a
// changed patch after deploy can fail when the cache already holds a prior patch.
if (process.env.VERCEL) {
  process.exit(0);
}

execSync("npx patch-package", { stdio: "inherit" });
