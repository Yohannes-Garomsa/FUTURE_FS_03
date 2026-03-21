# The Golden Spoon (Vanilla HTML/CSS/JS)

Production-minded single-page restaurant website built with:
- HTML
- CSS
- JavaScript

## Project Structure
- `index.html`: page structure and metadata
- `style.css`: all styles and responsive rules
- `script.js`: UI behavior, validation, cart, interactions
- `menu.json`: menu source data
- `favicon.svg`: site icon

## Run Locally
Use a local server (required for `fetch('menu.json')`):

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Production Readiness Features
- Defensive JS (safe DOM access and graceful fallbacks)
- Menu API failure handling with user-facing feedback
- Accessible navigation and filter tabs (keyboard + ARIA)
- Accessible cart panel behavior (`Escape`, focus return)
- Inline form validation (no blocking browser alerts for form errors)
- Safe dynamic rendering via DOM APIs (no `innerHTML` for data injection)
- Security headers baseline via CSP meta tag
- Favicon configured to avoid missing-resource noise

## Deployment Notes
- Deploy as static files on any static host (Netlify, Vercel static, GitHub Pages, Nginx, Apache).
- Ensure all files in repo root are deployed together.
- If serving via custom server, prefer response headers for CSP and security policies.

## Manual QA Checklist
- Mobile menu opens/closes with button, link click, and `Escape`.
- Menu filters work with mouse and keyboard arrows/home/end.
- Cart opens, closes, updates totals, and does not block the full page.
- Reservation/contact forms show inline errors and success messages.
- App still works when `menu.json` fails (shows fallback message).
- Lighthouse checks: no major accessibility or best-practice failures.
