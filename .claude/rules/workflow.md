# Development Workflow

## Philosophy: Build Knowledge Before Executing

Before writing or modifying code, ALWAYS:

1. Read the full memory bank
2. Identify the files that will be affected
3. Present a structured plan to the user:
   - Which files will be created/modified/deleted
   - Which dependencies are needed
   - What risks or side effects exist
4. Wait for explicit user confirmation
5. Execute changes in logical order
6. Record what was done in the memory bank

## Plan Structure

When presenting a plan, use this format:

```
## Plan: [descriptive name]

### Context
- Why this change is being made

### Proposed Changes
1. [file] - [create/modify/delete] - [description]
2. ...

### New Dependencies
- [package] - [reason]

### Risks
- [risk] - [mitigation]

### Estimation
- Complexity: [low/medium/high]
```

## Commits

After implementing, suggest a commit message following Conventional Commits.
