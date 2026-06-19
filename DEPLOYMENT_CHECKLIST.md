# WHBreeding - Complete Deployment Checklist ✅

## Files You Have Downloaded

✅ `BreedingOS-Final.jsx` → Rename to `App.jsx` in `src/` folder  
✅ `chat.js` → Place in `netlify/functions/` folder  
✅ `index.jsx` → Place in `src/` folder  
✅ `QUICK_START.md` → Reference guide  
✅ `SETUP_GUIDE.md` → Detailed setup  

---

## 📋 Complete Folder Structure to Create

```
WHBreeding/
├── public/
│   └── index.html (create new file - see below)
├── src/
│   ├── App.jsx (from BreedingOS-Final.jsx)
│   └── index.jsx (provided)
├── netlify/
│   └── functions/
│       └── chat.js (provided)
├── .gitignore (create new file - see below)
├── package.json (create new file - see below)
├── vite.config.js (create new file - see below)
├── netlify.toml (create new file - see below)
└── README.md (GitHub creates this)
```

---

## 📝 File Contents

### 1. `public/index.html` (NEW)
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

### 2. `src/App.jsx` (RENAME)
Copy content from `BreedingOS-Final.jsx`

### 3. `src/index.jsx` (PROVIDED)
Use the `index.jsx` file provided

### 4. `netlify/functions/chat.js` (PROVIDED)
Use the `chat.js` file provided

### 5. `.gitignore` (NEW)
```
node_modules/
.env
.env.local
.DS_Store
dist/
build/
*.log
.vscode/
.idea/
```

### 6. `package.json` (NEW)
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

### 7. `vite.config.js` (NEW)
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
})
```

### 8. `netlify.toml` (NEW)
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

---

## 🚀 Step-by-Step Deployment

### PHASE 1: GitHub Setup (5 minutes)

1. **Create repo:**
   - Go to https://github.com/new
   - Name: `WHBreeding`
   - Private: Yes
   - Initialize: ✓ README, ✓ .gitignore (Node)
   - Create repository

2. **Clone locally:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/WHBreeding.git
   cd WHBreeding
   ```

3. **Create folder structure:**
   ```bash
   mkdir -p public src netlify/functions
   ```

4. **Add all files** (use text editor):
   - Create each file from section above
   - Copy exact content provided
   - Save in correct folders

5. **Push to GitHub:**
   ```bash
   npm install
   git add .
   git commit -m "Initial commit: WHBreeding"
   git push origin main
   ```

### PHASE 2: Netlify Deployment (5 minutes)

1. **Connect Netlify:**
   - Go to https://netlify.com
   - Click **Add new site** → **Import an existing project**
   - Choose **GitHub** → Authorize
   - Select `WHBreeding` repo
   - Click **Deploy site** (default settings are fine)

2. **Netlify auto-deploys** from GitHub
   - Watch the build progress in Netlify Dashboard
   - Takes 2-3 minutes
   - Site will be live with a Netlify subdomain

### PHASE 3: AI Gateway Setup (2 minutes)

The chat is powered by Claude through the **Netlify AI Gateway**. Netlify injects
the gateway credentials automatically — there is no provider API key to obtain or
store.

1. **Enable AI features:**
   - Netlify Dashboard → Your site
   - **Site configuration** → **Build & deploy** → **Build with AI**
   - **Manage AI features** → ensure AI Gateway is enabled

2. **Do NOT set your own `ANTHROPIC_API_KEY`:**
   - A project-set Anthropic key makes Netlify stop injecting the matching
     gateway base URL, which breaks the connection. Leave the AI variables to
     the gateway.

3. **Trigger redeploy:**
   - Go to **Deployments**
   - Click the latest deploy
   - Click **Redeploy** button (so the function picks up the gateway credentials)

4. **Done!** 🎉
   - Your site is live with AI chat enabled

---

## 🧪 Testing Your Deployment

1. **Check your live site:**
   - URL will be something like: `whbreeding-xxxxx.netlify.app`
   - Open in browser

2. **Test the app:**
   - Go to **Horses** tab → Click **+ Add Horse** → Add a mare
   - Go to **Chat** tab → Switch to **Ask Questions**
   - Ask: "How many mares am I breeding?"
   - Should get AI response ✅

3. **If chat doesn't work:**
   - Check Netlify function logs
   - Verify AI features are enabled and the site has a fresh production deploy
   - Check browser console for errors

---

## ✅ Deployment Checklist

- [ ] GitHub repo created (`WHBreeding`)
- [ ] All files created in correct folders
- [ ] `npm install` ran successfully
- [ ] Pushed to GitHub `main` branch
- [ ] Netlify connected to GitHub repo
- [ ] Site is live (check Netlify Dashboard)
- [ ] AI features (AI Gateway) enabled in Netlify
- [ ] Site redeployed so the function picks up gateway credentials
- [ ] Tested chat - working! ✨

---

## 🔗 Important Links

- **GitHub:** https://github.com/YOUR_USERNAME/WHBreeding
- **Netlify:** https://app.netlify.com (find your site)
- **AI Gateway docs:** https://docs.netlify.com/build/ai-gateway/overview/
- **Live Site:** Check Netlify dashboard for URL

---

## 📞 Troubleshooting

**Build fails locally:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Site not deploying:**
- Check GitHub branch is `main`
- Verify Netlify has GitHub authorization
- Check build logs in Netlify Dashboard

**Chat not working:**
- Verify AI features (AI Gateway) are enabled in Netlify
- Confirm the site has a fresh production deploy
- Check function logs in Netlify
- Look for errors in browser DevTools

**Can't connect Netlify to GitHub:**
- Go to https://github.com/settings/applications
- Revoke Netlify app
- Reconnect from Netlify

---

## 🎯 You're Done!

Your WHBreeding site is now:
- ✅ Live on Netlify
- ✅ Connected to GitHub
- ✅ AI-powered with Claude
- ✅ Ready to manage your breeding operation

Start adding your mares and tracking your herd! 🐎
