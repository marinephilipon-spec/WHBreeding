# WHBreeding - Quick Start (5 Minutes)

## What You'll Do:
1. Create GitHub repo
2. Add 3 files
3. Connect Netlify
4. Enable AI Gateway
5. Done! ✨

---

## STEP 1: Create Repo on GitHub

Go to https://github.com/new
- **Name:** `WHBreeding`
- **Add:** README.md, .gitignore (Node), License
- Click Create → Copy the HTTPS URL

---

## STEP 2: Clone & Setup

```bash
git clone YOUR_REPO_URL
cd WHBreeding

# Create folders
mkdir -p public src netlify/functions

# Copy files (see below)
```

---

## STEP 3: Add These Files

### File 1: `public/index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WHBreeding</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #root { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="../src/index.jsx" type="module"></script>
</body>
</html>
```

### File 2: `src/index.jsx`
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### File 3: `src/App.jsx`
→ Copy `BreedingOS-Final.jsx` content here

### File 4: `netlify/functions/chat.js`
→ Copy `chat.js` content here

### File 5: `netlify.toml`
```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "dist"
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### File 6: `vite.config.js`
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
})
```

### File 7: `package.json`
```json
{
  "name": "whbreeding",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.383.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

---

## STEP 4: Push to GitHub

```bash
npm install
git add .
git commit -m "Initial commit: WHBreeding"
git push origin main
```

---

## STEP 5: Deploy on Netlify

1. Go to https://netlify.com (sign up if needed)
2. **Add new site** → **Import existing project**
3. **GitHub** → authorize → select `WHBreeding`
4. **Build command:** `npm run build`
5. **Publish dir:** `dist`
6. **Deploy** → Wait 2-3 min

---

## STEP 6: Enable AI Gateway

The chat runs on Claude through the Netlify AI Gateway — no API key needed.

1. Netlify Dashboard → Your site
2. **Site configuration** → **Build & deploy** → **Build with AI**
3. **Manage AI features** → ensure AI Gateway is enabled
4. **Redeploy** site so the function picks up the gateway credentials

> Don't add your own `ANTHROPIC_API_KEY` — it disables the gateway base URL
> injection and breaks the chat.

---

## Done! 🎉

Your site is now live!

**Links:**
- Live site: Check Netlify dashboard
- GitHub: https://github.com/YOUR_USERNAME/WHBreeding
- Admin: Netlify Dashboard

Start adding mares and tracking your breeding operation! 🐎
