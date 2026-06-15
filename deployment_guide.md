# Apex Finance - Web Deployment Guide

Because Apex Finance is a static front-end web application (pure HTML, CSS, and JS), you can deploy it to the web and share it with the world for **100% free** in less than 5 minutes.

Here are the three easiest ways to launch your application live:

---

## Option 1: Netlify Drop (Easiest & Fastest - No setup required)
This method takes 10 seconds and does not require git, GitHub, or any commands.

1. Open your web browser and go to [https://app.netlify.com/drop](https://app.netlify.com/drop) (Netlify's drag-and-drop hosting page).
2. Open your Windows File Explorer and navigate to:
   `C:\Users\veera\.gemini\antigravity\scratch\`
3. Drag the **`finance-tracker`** folder and drop it directly onto the circle in the Netlify web page.
4. Netlify will instantly upload your files and generate a live, secure public URL (e.g. `https://random-words-12345.netlify.app`).
5. You can register a free account on Netlify to customize the URL name (e.g. `https://my-apex-finance.netlify.app`) or hook up a custom domain.

---

## Option 2: GitHub Pages (Best for sharing your code & automatic updates)
This method hosts the site directly from a GitHub repository. Whenever you update your code on GitHub, your live website updates automatically.

### Step A: Initialize Git locally
We already have git installed on your machine! Run these commands in your shell to prepare the repo:
```powershell
git init
git add .
git commit -m "Initial commit - Apex Finance Tracker"
```

### Step B: Upload to GitHub
1. Go to [GitHub.com](https://github.com/) and create a free account (if you don't have one).
2. Click **New Repository**.
   - Name it: `finance-tracker`
   - Leave it **Public**.
   - Do **NOT** initialize with a README, gitignore, or license (keep it blank).
3. Copy the commands under "**…or push an existing repository from the command line**". It will look like this:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/finance-tracker.git
   git branch -M main
   git push -u origin main
   ```
4. Run those commands in your terminal inside the `C:\Users\veera\.gemini\antigravity\scratch\finance-tracker` folder.

### Step C: Turn on GitHub Pages
1. On your GitHub repository page, go to **Settings** (tab at the top).
2. Click on **Pages** in the left sidebar menu.
3. Under **Build and deployment**, set the Source dropdown to **Deploy from a branch**.
4. Under **Branch**, select `main` and `/ (root)` folder, then click **Save**.
5. Wait 1-2 minutes. GitHub will deploy your site to:
   `https://YOUR_USERNAME.github.io/finance-tracker/`

---

## Option 3: Vercel CLI (Best for command-line power users)
Vercel is a premium hosting platform. You can deploy directly from your command line.

1. Open your terminal in the `C:\Users\veera\.gemini\antigravity\scratch\finance-tracker` directory.
2. Run:
   ```bash
   npx vercel
   ```
3. The CLI will ask you to login (or sign up) and answer a few quick questions:
   - *Set up and deploy?* Yes
   - *Which scope?* (Select your username)
   - *Link to existing project?* No
   - *What's your project's name?* apex-finance
   - *In which directory is your code located?* `./`
   - *Want to modify build settings?* No
4. Vercel will upload and compile your code, providing a live production link instantly (e.g. `https://apex-finance.vercel.app`).
