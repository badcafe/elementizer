#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// remonte à la racine du package
const pkgRoot = path.resolve(__dirname, "..");

const viteBin = process.platform === "win32"
  ? "vite.cmd"
  : "vite";

spawn(
  viteBin,
  [],
  {
    stdio: "inherit",
    cwd: pkgRoot
  }
);
