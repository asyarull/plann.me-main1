# Plan.me

A minimal personal productivity dashboard for planning tasks, focusing, and tracking daily progress.

Plan.me is a lightweight, frontend-only app — no frameworks, no backend, no build step.

## Features

- Task management (add, edit, delete, complete / uncomplete)
- Task priorities (Low, Medium, High)
- Categories (Today, Personal, Learning, Projects)
- Focus timer (25-minute Pomodoro)
- Progress tracking
- Quick notes
- LocalStorage persistence
- Responsive design (desktop, tablet, mobile)
- Dynamic time-based greeting

## Tech stack

- HTML
- CSS
- Vanilla JavaScript

## How to run

1. Clone this repository
2. Open `index.html` in your browser

That’s it — everything works locally with no install step.

Optional: serve the folder with any static server if you prefer:

```bash
npx serve .
```

## Deployment

Plan.me can be deployed through [Vercel](https://vercel.com) by connecting the GitHub repository:

1. Push the project to a GitHub repository
2. Import the repository in Vercel
3. Keep the framework preset as **Other** (static site)
4. Leave the build command empty
5. Set the output directory to `.` (project root)
6. Deploy

If the app lives in a subfolder (for example `Plan.me/`), set that folder as the Vercel **Root Directory**.

No Node.js server is required.

## Data

All data is stored in the browser via `LocalStorage`:

- Tasks and completion state
- Quick notes
- Focus session count

Sample tasks appear only on the first visit. After that, your saved state is preserved across refreshes. Clearing site data in the browser (or using **Settings → Clear all data**) removes everything; clearing via Settings restores sample tasks for a fresh start.

## License

MIT
