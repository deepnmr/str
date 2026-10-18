import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defaultConfig, env, fill, loadConfig, rezongHome } from "../src/config.ts";
import { withState } from "./fakes.ts";

const state = withState();
afterEach(() => {
  delete process.env.DORI_STATE_DIR;
  delete process.env.REZONG_STATE_DIR;
});

test("the shipped example config loads, with ~ paths expanded and unset fields defaulted", async () => {
  const c = await loadConfig(join(import.meta.dir, "../../references/config.example.json"), "/home/ana");
  expect(c.stateDir).toBe("/home/ana/.rezong/state");
  expect(c.defaultCwd).toBe("/home/ana/code/my-project");
  expect(c.closeAfterMin).toBe(5);
  expect(c.guard.diskFreeMinGb).toBe(50);
});

test("a missing config file falls back to defaults and REZONG_STATE_DIR wins over the file", async () => {
  process.env.REZONG_STATE_DIR = state.dir;
  const c = await loadConfig("/nonexistent/config.json", "/home/ana");
  expect(c.stateDir).toBe(state.dir);
  expect(c.agentCommand).toEqual(["omo", "--model", "{model}", "{prompt}"]);
});

test("hook templates fill each argument separately, so text with spaces or quotes stays one argument", () => {
  const argv = fill(["notify", "--thread", "{thread}", "--text", "{text}"], { thread: "chat:1/2", text: `it's "done"; rm -rf /` });
  expect(argv).toEqual(["notify", "--thread", "chat:1/2", "--text", `it's "done"; rm -rf /`]);
});

test("REZONG_STATE_DIR beats DORI_STATE_DIR, and DORI_STATE_DIR is used when REZONG is unset", async () => {
  process.env.DORI_STATE_DIR = "/legacy/state";
  expect((await loadConfig("/nonexistent/config.json", "/home/ana")).stateDir).toBe("/legacy/state");
  expect(env("STATE_DIR")).toBe("/legacy/state");
  process.env.REZONG_STATE_DIR = "/new/state";
  expect((await loadConfig("/nonexistent/config.json", "/home/ana")).stateDir).toBe("/new/state");
});

test("the config dir is ~/.rezong, falling back to ~/.dori only when just ~/.dori/config.json exists", () => {
  const home = mkdtempSync(join(tmpdir(), "rezong-home-"));
  try {
    expect(rezongHome(home)).toBe(".rezong");
    expect(defaultConfig(home).stateDir).toBe(join(home, ".rezong", "state"));
    mkdirSync(join(home, ".dori"));
    writeFileSync(join(home, ".dori", "config.json"), "{}");
    expect(rezongHome(home)).toBe(".dori");
    expect(defaultConfig(home).stateDir).toBe(join(home, ".dori", "state"));
    mkdirSync(join(home, ".rezong"));
    writeFileSync(join(home, ".rezong", "config.json"), "{}");
    expect(rezongHome(home)).toBe(".rezong");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
