import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { seedStrAgentDir } from "../bin/lib/str-defaults.js"

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function home(): { home: string; agentDir: string } {
  const root = mkdtempSync(join(tmpdir(), "str-defaults-"))
  roots.push(root)
  return { home: root, agentDir: join(root, ".str", "agent") }
}

const PROVIDER = {
  baseUrl: "http://127.0.0.1:10100/v1",
  api: "openai-completions",
  apiKey: "opencodex-loopback",
  models: [{ id: "anthropic/claude-fable-5" }, { id: "anthropic/claude-opus-5-5" }],
}

function readJson(path: string): Record<string, any> {
  return JSON.parse(readFileSync(path, "utf8"))
}

function write(path: string, value: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true })
  writeFileSync(path, JSON.stringify(value))
}

describe("str agent-dir defaults", () => {
  test("#given a fresh home and a running opencodex #when str starts #then opencodex is the provider and default model, and the Dori skill is hidden", () => {
    const { home: dir, agentDir } = home()

    seedStrAgentDir({ agentDir, home: dir, env: {}, exportProvider: () => PROVIDER })

    expect(readJson(join(agentDir, "models.json")).providers.opencodex).toEqual(PROVIDER)
    expect(readJson(join(agentDir, "settings.json"))).toMatchObject({
      defaultProvider: "opencodex",
      defaultModel: "anthropic/claude-fable-5",
      skills: ["!dori-mode"],
    })
  })

  test("#given omo already runs on an opencodex model #when str seeds its defaults #then str starts on that same model", () => {
    const { home: dir, agentDir } = home()
    write(join(dir, ".omo", "agent", "settings.json"), { defaultProvider: "opencodex", defaultModel: "anthropic/claude-opus-5-5" })

    seedStrAgentDir({ agentDir, home: dir, env: {}, exportProvider: () => PROVIDER })

    expect(readJson(join(agentDir, "settings.json")).defaultModel).toBe("anthropic/claude-opus-5-5")
  })

  test("#given the user chose a model and kept other providers #when str starts again #then only the opencodex block is refreshed", () => {
    const { home: dir, agentDir } = home()
    write(join(agentDir, "models.json"), { providers: { mine: { baseUrl: "http://x" }, opencodex: { baseUrl: "stale", models: [] } } })
    write(join(agentDir, "settings.json"), { defaultProvider: "mine", defaultModel: "m1", theme: "dark" })

    seedStrAgentDir({ agentDir, home: dir, env: {}, exportProvider: () => PROVIDER })

    const models = readJson(join(agentDir, "models.json"))
    expect(models.providers.mine).toEqual({ baseUrl: "http://x" })
    expect(models.providers.opencodex).toEqual(PROVIDER)
    expect(readJson(join(agentDir, "settings.json"))).toMatchObject({ defaultProvider: "mine", defaultModel: "m1", theme: "dark" })
  })

  test("#given the user re-enabled dori-mode after the first seed #when str starts again #then the choice is kept", () => {
    const { home: dir, agentDir } = home()
    seedStrAgentDir({ agentDir, home: dir, env: {}, exportProvider: () => PROVIDER })
    const settings = readJson(join(agentDir, "settings.json"))
    write(join(agentDir, "settings.json"), { ...settings, skills: [] })

    seedStrAgentDir({ agentDir, home: dir, env: {}, exportProvider: () => PROVIDER })

    expect(readJson(join(agentDir, "settings.json")).skills).toEqual([])
  })

  test("#given opencodex is not installed #when str starts #then no provider or default model is invented", () => {
    const { home: dir, agentDir } = home()

    const result = seedStrAgentDir({ agentDir, home: dir, env: {}, exportProvider: () => undefined })

    expect(result.provider).toBe(false)
    const settings = readJson(join(agentDir, "settings.json"))
    expect(settings.defaultProvider).toBeUndefined()
    expect(settings.skills).toEqual(["!dori-mode"])
  })

  test("#given a settings.json that does not parse #when str starts #then it is left untouched", () => {
    const { home: dir, agentDir } = home()
    mkdirSync(agentDir, { recursive: true })
    writeFileSync(join(agentDir, "settings.json"), "{ broken")

    seedStrAgentDir({ agentDir, home: dir, env: {}, exportProvider: () => PROVIDER })

    expect(readFileSync(join(agentDir, "settings.json"), "utf8")).toBe("{ broken")
  })
})
