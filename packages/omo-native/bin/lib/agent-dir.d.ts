// Types for agent-dir.js, which computer-use-doctor-runtime.ts imports while omo-senpi typechecks it.

export declare const AGENT_DIR_ENV_NAMES: readonly string[]
export declare const ADOPTION_MARKER: string
export declare const ADOPTED_STATE_FILES: readonly string[]

export declare function runtimeHome(env?: NodeJS.ProcessEnv): string
export declare function brandHome(env?: NodeJS.ProcessEnv, home?: string): string
export declare function canonicalAgentDir(env?: NodeJS.ProcessEnv, home?: string): string
export declare function defaultAgentDir(home: string): string
export declare function legacyFlatAgentDir(home: string): string
export declare function adoptLegacyFlatState(env?: NodeJS.ProcessEnv, home?: string): {
  adopted: boolean
  copied: string[]
  backfilled: string[]
}
