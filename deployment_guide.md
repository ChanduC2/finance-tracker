# Trackora - Full-Stack Web Deployment Guide

## Why GitHub Pages Shows a Network Error
GitHub Pages is a **static web host**. It only hosts files like HTML, CSS, and client-side JavaScript. It **cannot run server-side code** (like your Python Flask backend `server.py`) or run database engines (like SQLite `database.db`). 

Because we transitioned Trackora to a secure backend with a database:
- The website makes `fetch()` requests to API endpoints like `/api/profiles` and `/api/profiles/signin`.
- When deployed on GitHub Pages, the site tries to find these endpoints on GitHub's static servers, which do not exist, resulting in a **404 Not Found** or **Network Error**.

To deploy Trackora live on the internet, you must use a **Full-Stack Hosting Platform** that runs Python and supports file persistence for the SQLite database.

---

## Recommended Free Deployment Options

Here are the two best ways to host your application for free:

### Option 1: Render (Recommended - Free Web Service)
[Render](https://render.com/) is a cloud platform that makes it very easy to run Python Flask apps.

1. **Create a GitHub Repository**:
   - Push your code to a repository on GitHub (make sure it includes `server.py`, `app.js`, `index.html`, `index.css`, and `package.json`).
   - Add a file named `requirements.txt` to the root folder specifying your Python dependencies:
     ```text
     Flask==3.0.0
     gunicorn==21.2.0
     ```

2. **Sign Up on Render**:
   - Go to [render.com](https://render.com/) and create a free account linked to your GitHub account.

3. **Create a New Web Service**:
   - Click **New +** and select **Web Service**.
   - Connect your GitHub repository.
   - Configure the Web Service settings:
     - **Name**: `apex-finance`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn server:app` (or `python server.py` if running development server, though `gunicorn` is recommended for production)
     - **Instance Type**: Select the **Free** tier.

4. **Add a Persistent Disk (Crucial for SQLite)**:
   - Render's free tier has an ephemeral filesystem (data resets when the server sleeps or restarts). To save your SQLite data permanently:
   - In your Web Service settings on Render, go to the **Disks** tab.
   - Click **Add Disk**:
     - **Name**: `db-volume`
     - **Mount Path**: `/var/data`
     - **Size**: `1 GB` (free)
   - Go to the **Environment** tab on Render and add an Environment Variable:
     - **Key**: `DATABASE_URL` (or update your `server.py` to point the SQLite database path to `/var/data/database.db` if deployed).

---

### Option 2: Railway (Extremely Simple Full-Stack Hosting)
[Railway](https://railway.app/) is a developer-friendly platform that automatically detects and builds Python Flask apps.

1. Go to [railway.app](https://railway.app/) and sign up.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Choose your `finance-tracker` repository.
4. Railway will automatically build and deploy your app.
5. In your service settings under **Variables**, click **New Variable** to add persistent directories, or add a persistent Volume to secure `database.db`.

---

## Option 3: Reverting to purely local `localStorage` (If you must use GitHub Pages)
If you specifically want to host the site on GitHub Pages for free without setting up a backend server:
- You would need to rewrite `app.js` to store all data in the user's browser via `localStorage` (like it did originally) instead of sending API requests to `server.py`.
- **Note**: Doing this means the data will only exist in that specific browser on that specific device and cannot be synced or shared.
