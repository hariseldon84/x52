# TaskQuest - Files to Upload to GitHub

## Required Files and Folders to Upload:

### Root Files:
- `README.md` ✓ (Created)
- `package.json` ✓
- `package-lock.json` ✓
- `tsconfig.json` ✓
- `vite.config.ts` ✓
- `tailwind.config.ts` ✓
- `postcss.config.js` ✓
- `components.json` ✓
- `drizzle.config.ts` ✓
- `.gitignore` ✓ (Updated)
- `replit.md` ✓

### Folders to Upload:
- `client/` (entire folder with all React components)
- `server/` (entire folder with backend code)
- `shared/` (database schema and types)

### DO NOT Upload:
- `node_modules/` (excluded in .gitignore)
- `dist/` (build folder)
- `.git/` (will be recreated)
- `.cache/`, `.local/`, `.upm/` (Replit-specific)

## Upload Method:
1. Create new GitHub repo
2. Use "uploading an existing file" option
3. Drag and drop all required files and folders
4. Commit with message: "Initial commit: TaskQuest gamified productivity app"

## Alternative: GitHub CLI
If you have GitHub CLI installed locally:
```bash
gh repo create taskquest --public --source . --push
```