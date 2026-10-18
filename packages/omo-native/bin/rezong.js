#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { findBunBinary } from "./lib/bun-runtime.js"

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "plugin", "skills", "rezong-mode", "scripts", "src", "cli.ts")

if (!existsSync(cli)) {
  console.error(`rezong: the bundled rezong-mode scripts are missing (${cli}); reinstall @deepnmr/str`)
  process.exit(1)
}
const bun = process.versions.bun ? process.execPath : findBunBinary()
if (!bun) {
  console.error("rezong: needs Bun >= 1.3 on PATH (https://bun.sh)")
  process.exit(1)
}
const result = spawnSync(bun, [cli, ...process.argv.slice(2)], { stdio: "inherit", windowsHide: true })
if (result.error) {
  console.error(`rezong: ${result.error.message}`)
  process.exit(1)
}
process.exit(result.status ?? 1)
