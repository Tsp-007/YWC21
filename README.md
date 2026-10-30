# Practice Studio — learning guide

## Files
- `index.html`: page structure and content (HTML)
- `style.css`: appearance, layout, responsive rules, and themes (CSS)
- `script.js`: interactions and application behavior (JavaScript)

## Run locally
Open `index.html` in a modern browser. For camera access, use localhost (for example, VS Code Live Server) or HTTPS; browsers generally restrict camera access on ordinary `file://` pages.

## Suggested learning order
1. Read `index.html`: identify `header`, `nav`, `main`, and the three page sections (`home`, `interview`, `presentation`).
2. Read `style.css`: start with `:root` color variables, then `body`, `.wrap`, `.card`, `.grid2`, and the media query.
3. Read `script.js`: follow the sections marked `/* theme */`, `/* camera */`, `/* routing */`, `/* questions */`, `/* timer */`, and `/* PDF */`.
4. Change one small thing at a time, refresh the page, and observe the result.

## Notes
- The original behavior and IDs/classes are preserved; the main inline CSS and JavaScript have been moved into external files.
- Some one-off `style="..."` attributes remain in the HTML so the first refactor stays easy to compare with the original. As a next exercise, move those declarations into CSS classes.
- PDF.js remains loaded from its existing CDN script in `index.html`.
