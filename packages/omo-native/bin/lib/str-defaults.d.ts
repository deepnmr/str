export declare const OPENCODEX_PROVIDER: "opencodex"
export declare const SKILLS_REPLACED_BY_REZONG: readonly string[]

export type OpencodexProvider = Record<string, unknown> & { readonly models: ReadonlyArray<{ readonly id: string }> }

export declare function exportOpencodexProvider(env?: NodeJS.ProcessEnv): OpencodexProvider | undefined

export declare function seedStrAgentDir(options: {
  readonly agentDir: string
  readonly env?: NodeJS.ProcessEnv
  readonly home?: string
  readonly exportProvider?: (env: NodeJS.ProcessEnv) => OpencodexProvider | undefined
}): { provider: boolean; defaults: boolean; hiddenSkills: boolean }
