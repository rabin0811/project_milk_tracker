# Design

Mobile-first (design for a 360 px wide phone), light theme, high contrast, readable outdoors and in early morning. English first; leave room for Nepali labels later.

## UI rules
- Tap targets at least 48 px. Numeric inputs use the numeric keypad (`inputmode="decimal"`).
- One main action per screen. Big primary **Save** button, always visible at the bottom.
- Confirm before Save with a short summary ("Farmer #7 Ram, Morning, 25 L, Fat 4.2"). After Save: clear success state and the entry is locked.
- Always show **sync status**: Pending (clock icon) / Synced (check) / Error (warning with reason).
- Show an **offline banner** when there is no connection.
- Admin tables become **cards** on small screens or scroll horizontally inside a container.
- Staff screens must never render rate or total fields, even as hidden elements.

## Staff screens
1. **Key login:** one numeric field, "Enter your key".
2. **Home:** buttons for New Entry and History; badge with count of pending entries; "Sync now".
3. **New entry:** searchable farmer dropdown (number + name) -> tabs **Milk | Money | Goods**
   - Milk: date (default today), shift toggle (Morning/Evening, default by time of day), litres, fat %.
   - Money: Advance / Payment toggle, amount (Rs), note.
   - Goods: item dropdown, quantity, unit, note.
4. **Duplicate warning** dialog if the same farmer + date + shift already has milk.
5. **History:** by farmer or by date; shows litres/fat, money (with Rs amounts), goods. No prices or totals.

## Admin screens
1. **Login** and forced **change password**.
2. **Dashboard:** period picker (today, 7 days, month, custom); cards for Total litres, Farmer cost, Factory revenue, Profit/Loss (green/red); charts: litres per day, profit/loss over time, litres by place, top farmers. Warning chip when rates are missing in the period.
3. **Farmers:** list, search, add/edit (number, name, place).
4. **Places & rates:** each place with current rate and "Change rate"; factory rate; link to rate log. Entries with a missing rate are highlighted.
5. **Staff:** list, add (shows key once), disable, reset key, optional place restriction, last sync time.
6. **Entries:** filter by date/farmer/place/staff; open an entry to edit or void (reason required).
7. **Farmer statement:** date range; milk amount, advances, goods, payments, balance.
8. **Logs:** tabs **Activity log** (audit) and **Rate log**.
9. **Corrections (hidden under Settings):** date-range rate correction with preview, reason, confirm.
10. **Settings:** change password, goods items, places.

## Branding: logo, icon and colors
**Theme: white and green only.** White is the page background; green is the brand color. No other accent hues for branding.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#FFFFFF` | Page and card background |
| `--color-surface` | `#F1F8F2` | Subtle sections, table stripes |
| `--color-primary` | `#2E7D32` | Buttons, headers, active tabs, links (white text on it passes contrast) |
| `--color-primary-dark` | `#1B5E20` | Pressed state, top bar, headings |
| `--color-primary-light` | `#E8F5E9` | Selected rows, chips, tinted backgrounds |
| `--color-text` | `#1B2A1D` | Body text (dark green-gray) |
| `--color-border` | `#CFE3D1` | Dividers and input borders |

Status colors are the only exception, and they must always come with an icon and text, never color alone: **amber** `#B26A00` for pending/warning, **red** `#C62828` for errors and losses. "Synced" and "profit" use the brand green plus a check icon.

**Logo:** a simple, flat illustration of a **cow and a milk jar** together (for example a cow's head beside a milk jar/can), in green on white. No text inside the symbol. A horizontal version (symbol + app name "Milk Tracker", working name) is used on the login screens and the top bar.

**App icon (PWA / home screen):**
- Same cow + milk jar symbol. Two variants: white symbol on a solid `#2E7D32` background (main), and green symbol on white (light contexts).
- Provide: SVG source, PNG 192x192 and 512x512, a **maskable** 512x512 (keep the symbol inside the central safe zone, about 80%), `apple-touch-icon` 180x180, and a favicon (32x32 and SVG).
- Web manifest: `theme_color: "#2E7D32"`, `background_color: "#FFFFFF"`.
- Show the logo on: staff key login, admin login, top bar, empty states (e.g. "No entries yet" with the cow and jar), and the splash screen.

Typography: a simple, highly legible sans-serif. Charts use green shades plus one contrasting neutral; label axes in Rs and litres, and keep series distinguishable without relying on color alone (patterns or direct labels).

## Accessibility and language
Labels always visible (not placeholders only). Plan i18n from the start (string table) so Nepali can be added later.
