import { join } from "node:path"
import { runtimeHome } from "./agent-dir.js"
import { HOME_DIRNAME } from "./brand.js"

// Endpoints an installed omo exports into its sessions; attaching to one would run str inside
// another product's host.
const FOREIGN_RPC_ENV_NAMES = ["OMO_RPC_SOCKET", "OMO_RPC_SHARD_ROOT", "SENPI_RPC_SOCKET", "PI_RPC_SOCKET"]

/**
 * Points every per-user omo path at the str home (STR_HOME_DIR, else ~/.str) in `env`.
 *
 * The shared packages resolve their roots from OMO_HOME_DIR, OMO_MEMORY_HOME and
 * OMO_LSP_DAEMON_DIR, and a str process started from an omo session inherits omo's values, so
 * they are overwritten rather than defaulted. Returns the str home.
 */
export function pinStrHome(env = process.env) {
  const homeDir = env.STR_HOME_DIR?.trim() || join(runtimeHome(env), HOME_DIRNAME)
  env.OMO_HOME_DIR = homeDir
  env.OMO_MEMORY_HOME = join(homeDir, "memory")
  env.OMO_LSP_DAEMON_DIR = join(homeDir, "lsp-daemon")
  for (const name of FOREIGN_RPC_ENV_NAMES) delete env[name]
  return homeDir
}
