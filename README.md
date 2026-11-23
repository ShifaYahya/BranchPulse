# BranchPulse

When one branch has a bad week, the sales total tells you *what* happened but not *why*. BranchPulse fills that gap.

You give it a few CSV exports (sales, staffing, stockouts, opening hours, customer feedback, local events). It tells you in plain English why a branch made less money. Every claim points to the exact rows in your files, and each explanation ends with a short list of things to fix.

It's built for multi-branch cafés, clinics, gyms and shops.

## What it does

- **Dashboard**: every branch at a glance, with the one that needs attention flagged
- **Branch explanation**: ranked reasons, the estimated money effect of each, how confident it is, and the records behind it
- **Daily briefs**: what went wrong on each day of the week
- **Compare**: any two branches side by side
- **Action tracker**: turn suggestions into tasks with owners and due dates
- **Records**: browse every row it read, using the same IDs the explanations cite
- **Sharing**: copy a brief to WhatsApp or email, print to PDF, export CSV
- **Optional AI write-up**: uses a free Google Gemini key, and every citation it makes is checked

## Privacy

There's no server and no account. Files are read in your browser and stay on your device.

## Run it

```bash
npm install
npm run dev
```

Other commands: `npm test` runs the tests, `npm run build` builds the site into `dist/`.

## Deploy

It's a static site. Import the repo into Vercel, Netlify or Cloudflare Pages. The build command is `npm run build` and the output folder is `dist`. No environment variables are needed.

## Your files

Only sales is required. Each extra file lets BranchPulse check one more possible reason. Column names are matched automatically. Inside the app, the File guide lists every accepted column and has templates you can download.

Built with React, TypeScript and Vite.
