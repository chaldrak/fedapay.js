#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const version = process.argv[2];

if (!version) {
  console.error("Usage: npm run release <version>");
  console.error("Exemple: npm run release 0.2.0");
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Version invalide: "${version}" — format attendu: X.Y.Z`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const current = pkg.version;

if (current === version) {
  console.error(`Version déjà à ${version} dans package.json`);
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

// Vérifier qu'il n'y a pas de changements non commités
try {
  execSync("git diff --exit-code && git diff --cached --exit-code", {
    stdio: "pipe",
  });
} catch {
  console.error("Des changements non commités existent. Commitez-les d'abord.");
  process.exit(1);
}

// Vérifier que le tag n'existe pas déjà
try {
  execSync(`git rev-parse v${version}`, { stdio: "pipe" });
  console.error(`Le tag v${version} existe déjà.`);
  process.exit(1);
} catch {
  // tag inexistant — c'est ce qu'on veut
}

run(`npm pkg set version="${version}"`);
run("git add package.json");
run(`git commit -m "chore: release v${version}"`);
run(`git tag v${version}`);

console.log(`
✅ v${version} prête — pour déployer :
   git push origin main && git push origin v${version}
`);
