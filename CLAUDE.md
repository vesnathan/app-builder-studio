# App Builder Studio - Claude Code Guide

## Project Overview

**App Builder Studio** - Landing page / marketing site for app building services.
- Static Next.js application
- Simple Lambda for contact form
- No backend database

**Location**: `/home/liqk1ugzoezh5okwywlr_/dev/app-builder-studio/`

**Note**: This is a simple landing page. Most full-stack architecture guidelines (React Hook Form, Zod, AppSync, CodeGen) do not apply.

---

## Shared Documentation

**IMPORTANT**: Read the architecture guidelines that apply to ALL projects:

- **Architecture Guidelines**: `/home/liqk1ugzoezh5okwywlr_/dev/ARCHITECTURE_GUIDELINES.md`
  - Includes all standards, patterns, and project compliance status

**Reference Implementation**: Check The Story Hub for patterns:
- `/home/liqk1ugzoezh5okwywlr_/dev/the-story-hub/`

---

## Commands

### Development

```bash
yarn dev                   # Start frontend dev server
yarn build                 # Build frontend
yarn lint                  # Run linter
yarn tsc                   # Type check TypeScript
```

### Deployment (USER ONLY - NEVER run automatically)

**Claude MUST NEVER run deploy commands directly.**
- Explain what needs to be deployed and what command to run
- You may prepare code and configurations for deployment

---

## Git Commit Process

**ALWAYS run BEFORE staging and committing:**

1. `yarn lint` - Run linter
2. `yarn tsc` - Type check TypeScript
3. Format with Prettier if available

Only proceed with `git add` and `git commit` after all checks pass.

---

## Compliance Status

**FULLY COMPLIANT (N/A)** - Simple landing page:
- Most full-stack guidelines don't apply
- All `any` types fixed with `Grecaptcha` interface

---

## Notes for Future Sessions

- Always read this file at the start of a new session
- Update this file with significant changes and lessons learned
- User prefers concise, technical communication
- Focus on facts and problem-solving over validation
