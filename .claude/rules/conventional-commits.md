# Conventional Commits

Format: `<type>[scope]: <description>`

## Types

| Type | Description | SemVer |
|------|-------------|--------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Documentation only | - |
| `style` | Formatting (no logic changes) | - |
| `refactor` | Restructure without changing functionality | - |
| `perf` | Performance improvements | - |
| `test` | Add or fix tests | - |
| `ci` | CI/CD changes | - |
| `build` | Build system or dependencies | - |
| `chore` | Other changes (configs, etc.) | - |

## Rules

- Type in lowercase, description in imperative mood
- Max 50 characters in the first line
- No period at the end of the description
- Breaking changes with `!` after type or in footer `BREAKING CHANGE:`
- Optional scope in parentheses: `feat(auth): add JWT refresh`
- Reference issues at the end: `Closes #123`
