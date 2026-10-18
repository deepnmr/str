# str fork notice

str is a modified fork of [code-yeongyu/oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) at commit `19db30f`. It's distributed under the Sustainable Use License 1.0, for free non-commercial use only.

## What changed

- The brand and command are `str`.
- The per-user home directory is `~/.str`.
- The kbsi-crystal-bank MCP server ships as a default.
- A session launch connects a running opencodex by default (its `ocx export --client omo` provider block and default model); set `STR_NO_DEFAULTS=1` to skip.
- The `rezong` command ships with the package, and the upstream `dori-mode` user skill is hidden in favour of the bundled rezong-mode.
- The rezong-mode skill is included. It's derived from [sisyphuslabs/omo-dori-mode-experimental](https://github.com/sisyphuslabs/omo-dori-mode-experimental), which is MIT licensed.

## License files

LICENSE.md and THIRD-PARTY-NOTICES.md are kept exactly as they appear upstream. Nothing in them has been modified.
