# WHBreeding Setup Guide

## Complete Folder Structure

```
WHBreeding/
├── public/
│   ├── index.html
│   └── favicon.ico (optional)
├── src/
│   └── App.jsx
├── netlify/
│   └── functions/
│       └── chat.js
├── .gitignore
├── package.json
├── README.md
└── netlify.toml
```

## Step 1: Create GitHub Repo

1. Go to https://github.com/new
2. **Repository name:** `WHBreeding`
3. **Description:** White Horse Breeding Management System
4. **Private:** Yes (or Public if you prefer)
5. **Initialize:** Add README.md, .gitignore (Node)
6. Click **Create repository**

## Step 2: Clone and Setup Locally

```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/WHBreeding.git
cd WHBreeding

# Install dependencies
npm install
```

## Step 3: Create Project Structure

Create these files in your local repo:

### A. `public/index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WHBreeding - Breeding Management</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #root { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="../src/index.jsx" type="module"></script>
</body>
</html>
```

### B. `src/index.jsx`
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

### C. `src/App.jsx`
→ Use the BreedingOS-Final.jsx file provided

### D. `netlify/functions/chat.js`
→ Use the chat.js file provided

### E. `.gitignore`
```
node_modules/
.env
.env.local
.DS_Store
dist/
build/
*.log
```

### F. `netlify.toml`
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

### G. `.github/workflows/deploy.yml` (Optional - for auto-deploy)
```yaml
name: Deploy to Netlify
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: netlify/actions/cli@master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Step 4: Update package.json

```json
{
  "name": "whbreeding",
  "version": "1.0.0",
  "description": "White Horse Breeding Management System",
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
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Step 5: Create vite.config.js (for local development)

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

## Step 6: Push to GitHub

```bash
git add .
git commit -m "Initial commit: WHBreeding setup"
git push origin main
```

## Step 7: Connect Netlify

1. Go to https://netlify.com
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub**, authorize, select `WHBreeding`
4. **Build command:** `npm run build`
5. **Publish directory:** `dist`
6. Click **Deploy site**

## Step 8: Enable AI Gateway

The chat is powered by Claude through the **Netlify AI Gateway** — there is no
provider API key to manage. Netlify injects the gateway credentials into the
function automatically once AI features are enabled.

1. Netlify Dashboard → Site configuration → Build & deploy → **Build with AI**
2. **Manage AI features** and ensure AI Gateway is enabled
3. Trigger a fresh production deploy so the function runtime picks up the
   injected gateway credentials

> Do **not** set your own `ANTHROPIC_API_KEY` in the Netlify environment. A
> project-set key makes Netlify stop injecting the matching gateway base URL,
> which breaks the connection. Leave the AI variables to the gateway.

## Step 9: Test Deployment

1. Your site will be live at a Netlify URL
2. Test chat with "Ask Questions" mode
3. Try adding a mare to test functionality

---

## Files to Download

- `BreedingOS-Final.jsx` → Save as `src/App.jsx`
- `chat.js` → Save as `netlify/functions/chat.js`

---

## Troubleshooting

**Chat not working?**
- Check Netlify function logs: Dashboard → Functions → chat
- Verify AI features are enabled and the site has a fresh production deploy

**Build failing?**
- Run `npm install` locally
- Check Node version: `node -v` (should be 18+)

**Site not deploying?**
- Push to main/master branch
- Check GitHub Actions logs
- Verify Netlify has GitHub access

---

## Next Steps

1. Add your first mare
2. Start logging updates
3. Ask questions about your herd
4. Upload documents for each mare
5. Track breeding schedule and actions
