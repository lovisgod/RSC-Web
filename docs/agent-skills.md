# Creating Agent-Agnostic Project Skills

Project skills live in `.agents/skills/<skill-name>/SKILL.md`. Their content follows the open Agent Skills convention and must not depend on a particular model, agent product, or proprietary tool name.

## Minimal skill

```text
.agents/skills/example-skill/
└── SKILL.md
```

```markdown
---
name: example-skill
description: What the skill does and the concrete situations that should trigger it.
---

# Example Skill

1. Read the relevant project sources.
2. Apply the project-specific workflow.
3. Run the required verification.
```

Only `name` and `description` belong in the frontmatter. Use lowercase hyphenated names.

## Creation process

1. Collect three realistic prompts that should trigger the skill.
2. Write down knowledge or procedure an otherwise capable agent would not know.
3. Keep `SKILL.md` concise and imperative.
4. Put detailed material in `references/`.
5. Put deterministic repeated work in `scripts/`.
6. Avoid generic programming advice and duplicated repository documentation.
7. Validate the skill and exercise it on a real task.
8. Revise it when an agent repeatedly misses or misapplies a rule.

## Good descriptions

A description is the trigger. Include the capability and situations:

```yaml
description: Review and implement payment webhooks safely. Use for provider callbacks, idempotency, payment state transitions, retries, and signature verification.
```

Avoid vague descriptions such as `Helps with backend work`.

## Portability

The canonical directory is `.agents/skills`. Different agents discover skills in different directories, so this repository links their discovery directory to the same canonical content:

- `.claude/skills`
- `.cursor/skills`
- `.gemini/skills`
- `.github/skills`

Do not fork separate copies. Vendor-specific UI metadata may be generated outside the canonical skill, but business instructions must remain portable.

## Validation

Run:

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/example-skill
```

The validator location can differ by agent. Validation is straightforward: require valid YAML frontmatter, matching folder/name, a useful description, and no unfinished placeholders.
