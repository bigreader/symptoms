# Symptom Tracker

A tiny, private symptom log for tracking a bout of illness (cold, flu, COVID, etc.) day to day. No backend, no accounts — everything is stored in your browser's `localStorage`.

## Use it locally

Just open `index.html` in a browser. No build step, no server required.

## Host on GitHub Pages

1. Create a new GitHub repo and push these files to it:
   ```
   git init
   git add index.html style.css app.js README.md
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. In the repo on GitHub: **Settings → Pages → Source**, select branch `main` and folder `/ (root)`, then save.
3. Your tracker will be live at `https://<your-username>.github.io/<repo-name>/`.

## Notes on data

- All entries live only in the browser you use, on the device you use — nothing is sent anywhere.
- Clearing your browser's site data (or switching browsers/devices) will lose your history, so use the **Export** button periodically to save a JSON backup, and **Import** to restore it later or move it to another device/browser.
