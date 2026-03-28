# CamForge Quick Reference

## Vite

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start local dev server (hot reload) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the `dist/` build locally |

## Git

```bash
# Stage everything (new files, changes, deletions)
git add .

# Stage specific files or folders
git add src/newFolder/ src/newFile.js

# Commit
git commit -m "Your message here"

# Push to remote
git push
```

## Deploy to GitHub Pages

```bash
# One command — builds then publishes dist/ to gh-pages branch
npm run deploy
```

Live site: <https://NickCason.github.io/CamForge/>
