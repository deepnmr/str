import { userInfo } from "node:os"
import { dirname, join, posix, resolve } from "node:path"
import { toPosixPath } from "../internal/posix-path"
import { DEFAULT_READ_FILE_SYSTEM, type OmoConfigEnv, type OmoConfigReadFileSystem } from "./types"

export type OmoConfigPathCandidate = {
  readonly path: string
  readonly scope: "project" | "user"
}

export type ResolveOmoConfigPathsOptions = {
  readonly cwd: string
  readonly env?: OmoConfigEnv
  readonly fileSystem?: OmoConfigReadFileSystem
  readonly platform?: NodeJS.Platform
}

export const MAX_PROJECT_CONFIG_DIRECTORY_DEPTH = 256

/**
 * Config file names in one directory, highest precedence first: the first that exists is the layer.
 * str.json(c) is the str name; omo.json(c) stays readable so an existing config keeps loading.
 */
export const OMO_CONFIG_FILE_NAMES = ["str.jsonc", "str.json", "omo.jsonc", "omo.json"] as const

/** The file a new config is created as when the directory holds none of OMO_CONFIG_FILE_NAMES. */
export const DEFAULT_OMO_CONFIG_FILE_NAME = "str.jsonc"

/** The highest-precedence existing config file in `directory`, else the default new-file path. */
export function resolveOmoConfigFileIn(
  directory: string,
  isPresent: (path: string) => boolean,
): { readonly path: string; readonly exists: boolean } {
  for (const name of OMO_CONFIG_FILE_NAMES) {
    const path = join(directory, name)
    if (isPresent(path)) return { path, exists: true }
  }
  return { path: join(directory, DEFAULT_OMO_CONFIG_FILE_NAME), exists: false }
}

const ACCOUNT_HOME_DIR = userInfo().homedir

export function resolveHomeDir(env: OmoConfigEnv = process.env): string {
  const homeDir = env.HOME ?? env.USERPROFILE ?? process.cwd()
  return homeDir.startsWith("/") ? posix.resolve(homeDir) : toPosixPath(resolve(homeDir))
}

/** The user config file the loader reads (see OMO_CONFIG_FILE_NAMES), else the str.jsonc a write creates. */
export function resolveUserOmoConfigPath(
  env: OmoConfigEnv = process.env,
  fileSystem: Pick<OmoConfigReadFileSystem, "existsSync"> = DEFAULT_READ_FILE_SYSTEM,
): string {
  return resolveOmoConfigFileIn(resolveUserOmoConfigDirectory(env), (path) => fileSystem.existsSync(path)).path
}

export function resolveUserOmoConfigDirectory(env: OmoConfigEnv = process.env): string {
  const omoHomeDir = env.OMO_HOME_DIR?.trim()
  if (omoHomeDir) return toPosixPath(resolve(omoHomeDir))
  return join(resolveHomeDir(env), ".omo")
}

function isSymlinkedProjectPath(path: string, fileSystem: OmoConfigReadFileSystem): boolean {
  if (fileSystem.lstatSync === undefined || !fileSystem.existsSync(path)) return false
  try {
    return fileSystem.lstatSync(path).isSymbolicLink()
  } catch (error) {
    if (error instanceof Error) return true
    throw error
  }
}

function isLoadableProjectConfigFile(path: string, fileSystem: OmoConfigReadFileSystem): boolean {
  return fileSystem.existsSync(path) && !isSymlinkedProjectPath(path, fileSystem)
}

function detectOmoJsonPath(dir: string, fileSystem: OmoConfigReadFileSystem): string | null {
  const omoDir = join(dir, ".omo")
  if (isSymlinkedProjectPath(omoDir, fileSystem)) return null
  const found = resolveOmoConfigFileIn(omoDir, (path) => isLoadableProjectConfigFile(path, fileSystem))
  return found.exists ? found.path : null
}

function realpathOrSelf(path: string, fileSystem: OmoConfigReadFileSystem): string {
  if (fileSystem.realpathSync === undefined) return path
  try {
    return fileSystem.realpathSync(path)
  } catch {
    return path
  }
}

export function findProjectConfigPathsFarthestFirst(
  cwd: string,
  homeDir: string,
  fileSystem: OmoConfigReadFileSystem,
  accountHomeDir: string = homeDir,
): readonly string[] {
  // process.cwd(), HOME, and the account home can disagree in symlink form
  // (/var vs /private/var), so compare real paths while returned candidates
  // keep the caller's path form.
  const startDir = resolve(cwd)
  const boundaryDirs = [...new Set([resolve(homeDir), resolve(accountHomeDir)])]
  const realBoundaryDirs = new Set(boundaryDirs.map((path) => realpathOrSelf(path, fileSystem)))
  const nearestFirst: string[] = []
  let currentDir = startDir

  for (let depth = 0; depth < MAX_PROJECT_CONFIG_DIRECTORY_DEPTH; depth += 1) {
    const isHomeDir = boundaryDirs.includes(currentDir) || realBoundaryDirs.has(realpathOrSelf(currentDir, fileSystem))
    // A home `.omo` is a user layer, so the walk must not also claim it as a project layer.
    const configPath = isHomeDir ? null : detectOmoJsonPath(currentDir, fileSystem)
    if (configPath !== null) nearestFirst.push(configPath)
    if (isHomeDir) break
    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) break
    currentDir = parentDir
  }

  return nearestFirst.reverse()
}

export function resolveOmoConfigPaths(options: ResolveOmoConfigPathsOptions): readonly OmoConfigPathCandidate[] {
  const fileSystem = options.fileSystem ?? DEFAULT_READ_FILE_SYSTEM
  const env = options.env ?? process.env
  const userPath = resolveUserOmoConfigPath(env, fileSystem)
  const projectPaths = findProjectConfigPathsFarthestFirst(options.cwd, resolveHomeDir(env), fileSystem, ACCOUNT_HOME_DIR)
  return [
    { path: userPath, scope: "user" },
    ...projectPaths.map((path): OmoConfigPathCandidate => ({ path, scope: "project" })),
  ]
}
