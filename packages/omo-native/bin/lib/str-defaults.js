import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { delimiter, dirname, join } from "node:path"

export const OPENCODEX_PROVIDER = "opencodex"
export const SKILLS_REPLACED_BY_REZONG = ["!dori-mode"]

function readJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch {
    return undefined
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.str-${process.pid}.tmp`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  renameSync(temp, path)
}

function findOnPath(command, env) {
  for (const directory of (env.PATH ?? "").split(delimiter)) {
    if (directory && existsSync(join(directory, command))) return join(directory, command)
  }
  return undefined
}

export function exportOpencodexProvider(env = process.env, run = spawnSync) {
  const ocx = findOnPath("ocx", env) ?? findOnPath("opencodex", env)
  if (ocx === undefined) return undefined
  const result = run(ocx, ["export", "--client", "omo", "--json"], {
    encoding: "utf8",
    env,
    timeout: 10_000,
    windowsHide: true,
    stdio: ["ignore", "pipe", "ignore"],
  })
  if (result.error || result.status !== 0) return undefined
  try {
    const provider = JSON.parse(result.stdout)?.providers?.[OPENCODEX_PROVIDER]
    return isRecord(provider) && Array.isArray(provider.models) && provider.models.length > 0 ? provider : undefined
  } catch {
    return undefined
  }
}

function modelOmoAlreadyUses(home, models) {
  const settings = readJsonFile(join(home, ".omo", "agent", "settings.json"))
  if (!isRecord(settings) || settings.defaultProvider !== OPENCODEX_PROVIDER) return undefined
  const id = settings.defaultModel
  return typeof id === "string" && models.some((model) => model?.id === id) ? id : undefined
}

/**
 * Seeds the str agent dir so a fresh install works with no setup:
 * - models.json: the opencodex provider block, refreshed from opencodex on every launch (opencodex
 *   owns it, exactly as its omo integration does); other providers are left alone.
 * - settings.json: defaultProvider/defaultModel point at opencodex when unset, and the replaced
 *   Dori skill is hidden. Keys the user set are never overwritten.
 * Fail-open: without opencodex nothing is written for it.
 */
export function seedStrAgentDir({ agentDir, env = process.env, home = env.HOME || homedir(), exportProvider = exportOpencodexProvider } = {}) {
  const result = { provider: false, defaults: false, hiddenSkills: false }
  const provider = exportProvider(env)

  if (provider !== undefined) {
    const modelsPath = join(agentDir, "models.json")
    const current = readJsonFile(modelsPath)
    if (current === undefined && existsSync(modelsPath)) return result
    const document = isRecord(current) ? current : {}
    const providers = isRecord(document.providers) ? document.providers : {}
    if (JSON.stringify(providers[OPENCODEX_PROVIDER]) !== JSON.stringify(provider)) {
      writeJsonAtomic(modelsPath, { ...document, providers: { ...providers, [OPENCODEX_PROVIDER]: provider } })
      result.provider = true
    }
  }

  const settingsPath = join(agentDir, "settings.json")
  const currentSettings = readJsonFile(settingsPath)
  if (currentSettings === undefined && existsSync(settingsPath)) return result
  const settings = isRecord(currentSettings) ? { ...currentSettings } : {}
  let changed = false
  if (provider !== undefined && settings.defaultProvider === undefined && settings.defaultModel === undefined) {
    settings.defaultProvider = OPENCODEX_PROVIDER
    settings.defaultModel = modelOmoAlreadyUses(home, provider.models) ?? provider.models[0].id
    result.defaults = changed = true
  }
  const skills = Array.isArray(settings.skills) ? settings.skills : []
  const missing = SKILLS_REPLACED_BY_REZONG.filter((pattern) => !skills.includes(pattern) && !skills.includes(`+${pattern.slice(1)}`))
  if (missing.length > 0 && !settings.strSkillDefaultsApplied) {
    settings.skills = [...skills, ...missing]
    settings.strSkillDefaultsApplied = true
    result.hiddenSkills = changed = true
  }
  if (changed) writeJsonAtomic(settingsPath, settings)
  return result
}
