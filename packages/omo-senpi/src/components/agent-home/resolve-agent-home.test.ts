import { describe, expect, test } from "bun:test"
import { join, resolve } from "node:path"

import { AGENT_HOME_SENTINEL, resolveAgentHome } from "./resolve-agent-home"

const HOME = "/home/tester"

describe("resolveAgentHome", () => {
  describe("#given an explicitly configured agent directory", () => {
    describe("#when several prefixes are set", () => {
      test("#then the branded name wins over the legacy names", () => {
        const home = resolveAgentHome({
          env: {
            OMO_CODING_AGENT_DIR: "/explicit/omo",
            SENPI_CODING_AGENT_DIR: "/explicit/senpi",
            PI_CODING_AGENT_DIR: "/explicit/pi",
          },
          homeDir: HOME,
          exists: () => false,
        })

        expect(home).toBe(resolve("/explicit/omo"))
      })

      test("#then each legacy name still works on its own", () => {
        expect(
          resolveAgentHome({ env: { SENPI_CODING_AGENT_DIR: "/explicit/senpi" }, homeDir: HOME, exists: () => false }),
        ).toBe(resolve("/explicit/senpi"))
        expect(
          resolveAgentHome({ env: { PI_CODING_AGENT_DIR: "/explicit/pi" }, homeDir: HOME, exists: () => false }),
        ).toBe(resolve("/explicit/pi"))
      })

      test("#then a blank value is ignored", () => {
        expect(resolveAgentHome({ env: { OMO_CODING_AGENT_DIR: "   " }, homeDir: HOME, exists: () => false })).toBe(
          join(HOME, ".senpi", "agent"),
        )
      })
    })
  })

  describe("#given no configured directory", () => {
    describe("#when the branded home holds engine state", () => {
      test("#then the flat branded home is used", () => {
        const home = resolveAgentHome({
          env: {},
          homeDir: HOME,
          exists: (path) => path === join(HOME, ".omo", AGENT_HOME_SENTINEL),
        })

        expect(home).toBe(join(HOME, ".omo"))
      })
    })

    describe("#when only the engine layout exists", () => {
      test("#then the legacy agent directory is used", () => {
        expect(resolveAgentHome({ env: {}, homeDir: HOME, exists: () => false })).toBe(join(HOME, ".senpi", "agent"))
      })
    })
  })

  describe("#given OMO_HOME_DIR names a brand home", () => {
    describe("#when that home holds a settings.json sentinel", () => {
      test("#then the canonical agent directory under it is used", () => {
        const brand = "/custom/omo-home"
        const home = resolveAgentHome({
          env: { OMO_HOME_DIR: brand },
          homeDir: HOME,
          exists: (path) => path === join(resolve(brand), "agent", AGENT_HOME_SENTINEL),
        })

        expect(home).toBe(join(resolve(brand), "agent"))
      })

      test("#then the flat home under it is used when only that sentinel exists", () => {
        const brand = "/custom/omo-home"
        const home = resolveAgentHome({
          env: { OMO_HOME_DIR: brand },
          homeDir: HOME,
          exists: (path) => path === join(resolve(brand), AGENT_HOME_SENTINEL),
        })

        expect(home).toBe(resolve(brand))
      })
    })

    describe("#when no sentinel exists under it", () => {
      test("#then the engine layout under the real home is used, not the override", () => {
        const home = resolveAgentHome({ env: { OMO_HOME_DIR: "/custom/omo-home" }, homeDir: HOME, exists: () => false })

        expect(home).toBe(join(HOME, ".senpi", "agent"))
      })
    })

    describe("#when OMO_CODING_AGENT_DIR is also set", () => {
      test("#then the explicit agent directory still wins", () => {
        const home = resolveAgentHome({
          env: { OMO_HOME_DIR: "/custom/omo-home", OMO_CODING_AGENT_DIR: "/explicit/agent" },
          homeDir: HOME,
          exists: () => true,
        })

        expect(home).toBe(resolve("/explicit/agent"))
      })
    })

    describe("#when OMO_HOME_DIR is blank", () => {
      test("#then the branded home under the real home is used", () => {
        const home = resolveAgentHome({
          env: { OMO_HOME_DIR: "   " },
          homeDir: HOME,
          exists: (path) => path === join(HOME, ".omo", "agent", AGENT_HOME_SENTINEL),
        })

        expect(home).toBe(join(HOME, ".omo", "agent"))
      })
    })
  })

  describe("#given the canonical branded agent directory holds engine state", () => {
    describe("#when no directory is configured", () => {
      test("#then it wins over the legacy flat home", () => {
        const home = resolveAgentHome({
          env: {},
          homeDir: HOME,
          exists: (path) =>
            path === join(HOME, ".omo", "agent", AGENT_HOME_SENTINEL) || path === join(HOME, ".omo", AGENT_HOME_SENTINEL),
        })

        expect(home).toBe(join(HOME, ".omo", "agent"))
      })
    })
  })
})
