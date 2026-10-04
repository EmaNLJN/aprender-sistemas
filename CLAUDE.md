@AGENTS.md

## Claude Code

`AGENTS.md` es la fuente única de instrucciones; este archivo sólo la importa para las
versiones de Claude Code que no la cargan de forma nativa. `.claude/skills/` expone por
symlink las skills de `.agents/skills/`, salvo `code-review`: usá el `/code-review` incluido.
Los subagentes `revisor` e `implementador` de `.claude/agents/` aplican el reparto de modelos
de «Trabajo con subagentes».
