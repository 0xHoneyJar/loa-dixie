---
paths:
  - "*.sh"
  - "*.bats"
origin: enacted
version: 1
enacted_by: cycle-049
---

# Shell File Creation Safety

Bash heredocs silently corrupt source files containing `${...}` template literals.

| Method | Shell Expansion | When to Use |
|--------|-----------------|-------------|
| **Write tool** | None | Source files (.tsx, .jsx, .ts, .js, etc.) - PREFERRED |
| `<<'EOF'` (quoted) | None | Shell content with literal `${...}` |
| `<< EOF` (unquoted) | Yes | Shell scripts needing variable expansion only |

**Rule**: For source files, ALWAYS use Write tool. If heredoc required, ALWAYS quote the delimiter.

**Protocol**: `.claude/protocols/safe-file-creation.md`
