# Ita 3D — website (v3)

Static site for GitHub Pages. No server, no database, no cost.

## Folder structure

```
ita3d-site/
├── index.html        Home: hero, photo carousel, print queue, how it works, filament stock
├── modelos.html      Catalog of models ("Em estoque" / "Para imprimir")
├── enviar.html       Order builder -> opens WhatsApp with the message ready
├── pedido.html       "Meu pedido": customers look up their order by code
├── info.html         About, 3D printing explained, materials, contact, complaints
├── admin.html        Management panel (not linked anywhere on the site)
├── data/             <- EVERYTHING YOU UPDATE DAY TO DAY IS HERE
│   ├── config.js       WhatsApp number, Instagram, opening hours, PRINT QUEUE
│   ├── filamentos.js   Materials (PLA, PETG...) and the filament spools in stock
│   ├── modelos.js      Catalog models + home page carousel photos
│   ├── precos.js       Prices and the formula behind the automatic estimate
│   └── pedidos.js      Orders (code, description, status) — PUBLIC, no customer data
├── images/
│   ├── filamentos/     Optional spool photos
│   ├── impressoes/     Photos of your prints (home carousel)
│   ├── modelos/        Catalog model photos
│   └── logo/           Favicon / logo
├── css/style.css
└── js/                 Page logic (you shouldn't need to touch this)
```

Each `images/` folder has a README.txt with the expected file names and sizes.
Missing photos show a "Foto em breve" placeholder, so the site works before you have photos.

## First things to edit

1. `data/config.js` → put your real **WhatsApp number** (`55` + DDD + number, digits only).
2. `data/filamentos.js` → list the spools you actually have.
3. `data/modelos.js` → your real models and prices.
4. `info.html` → adjust the "Sobre nós" and "Pedidos e prazos" texts.

## Day-to-day: the management panel (`admin.html`)

Open `admin.html` (e.g. `https://YOUR-USER.github.io/ita3d/admin.html`). It is not linked from the
site and asks search engines not to index it. Everything is edited there, nothing by hand:

| Tab | What you do |
|---|---|
| **Pedidos** | Create an order → it gets a code like `ITA-7K3F` (copied automatically to send the customer). Change status: na fila → imprimindo → pronto → entregue. The home page queue counts itself. |
| **Filamentos** | Turn "Em estoque" on/off, add colors (name + color picker), edit material texts, add materials (ABS, TPU…). |
| **Modelos** | Edit catalog items, upload photos (auto-resized), reorder, manage the home carousel. |
| **Preços** | Every price/formula number, plus a **simulator**: load an STL and see grams/time/price for every quality — compare with Bambu Studio while you tweak. |
| **Loja** | WhatsApp number, Instagram, hours, pickup text, queue lead-time text. |

Changes pile up in the bar at the bottom; nothing is saved until you press **Publicar**.

### Three ways to connect

1. **GitHub (normal use, works on the phone).** Needs a personal access token, created once:
   github.com → Settings → Developer settings → **Fine-grained tokens** → Generate new token →
   *Only select repositories*: your site repo → Permissions → **Contents: Read and write** → Generate.
   Paste it in the panel. Tick "Lembrar neste aparelho" only on your own devices.
   Each Publicar becomes a commit, and the site updates about 1 minute later.
   If the token leaks, delete it on GitHub and create another.
2. **Pasta no computador (before publishing).** Chrome/Edge on a computer: pick the `ita3d-site`
   folder and the panel writes the files directly.
3. **Só olhar.** Opens the published data read-only, to explore the panel.

**Orders are public** (that's how customers will look them up in v3). Only write what is being
printed — never names, phone numbers or addresses. Keep customer details in your WhatsApp.

**Data file format.** Each `data/*.js` file is a comment header followed by `window.NAME = <JSON>;`.
The panel reads them as plain JSON (it never executes them) and keeps the header comments when saving.
If you edit one by hand, keep it valid JSON: double quotes everywhere, no comments inside the value,
no trailing commas. If you break it, the panel shows which file and where.

## Testing on your computer

Just double-click `index.html`. The data is in `.js` files (not `.json`) precisely so
the site works when opened straight from disk, with no local server.

## Publishing on GitHub Pages (free)

1. Create a GitHub account and a new **public** repository, e.g. `ita3d`.
2. On the repo page: **Add file → Upload files**, drag in *the contents* of this folder
   (index.html etc. must be at the repo root, not inside a subfolder), then **Commit**.
3. **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*,
   Branch = `main`, folder = `/ (root)` → **Save**.
4. After 1–2 minutes the site is live at `https://YOUR-USER.github.io/ita3d/`.

Optional later: a custom domain (e.g. `ita3d.com.br`, ~R$40/year at registro.br) can be pointed at GitHub Pages.

## How ordering works

The "Enviar" page builds a WhatsApp message with material, color(s), resolution, part type,
quantity and notes, and opens `wa.me/<your number>`. WhatsApp links can only carry text, so
the customer attaches the 3D file themselves in the chat. The page tells them to do that.

## Automatic estimate (v2)

When a customer picks an **STL, 3MF or OBJ** file on the "Enviar" page, the browser:

1. reads the file locally (it is never uploaded anywhere),
2. shows it in 3D on a 256 mm grid (the A1 bed) in the chosen filament color,
3. measures size, volume and surface area, with a **Escala %** field to resize,
4. shows a price range, grams of filament and machine time, and adds them to the WhatsApp message.

It warns when the part is bigger than the bed, suspiciously tiny (wrong units), or has a broken mesh.
STEP files and unreadable files still go through; they just get no automatic estimate.
Delivery time is never promised by the site: it depends on the queue and is agreed on WhatsApp.

**The formula** (all numbers in `data/precos.js`):

```
material (g) = (walls/shell + infill × inner volume) × support factor × density
time         = material volume ÷ extrusion rate + seconds per layer × layers + warm-up
price        = (filament cost + machine hours × R$/h) × margin + fixed fee   (≥ minimum)
               multicolor adds a percentage
```

**Calibrating:** slice a few of your usual jobs in Bambu Studio, then load the same STL on the site
with the same settings and compare:
- grams too low/high → change `fatorSuporte` (or the `qualidade` walls/infill to match your profiles)
- time too low/high → change `fluxo` for that resolution (higher = faster)
- price → `precoKg`, `precoHora`, `margem`, `taxaFixa`, `precoMinimo`

The 3D viewer uses three.js r147 (MIT license), stored inside the site in `js/vendor/three/` and loaded
only when someone picks a file. No CDN is involved.

## Security

**Your checklist:**
- Turn on **two-factor authentication** on your GitHub account. It is the master key to the site.
- Create the panel token as **fine-grained**, for **only the site repository**, with only
  **Contents: Read and write**, expiring in ~90 days.
- Tick "Lembrar neste aparelho" only on your own devices. If a device is lost or the token leaks,
  delete the token on GitHub (Settings → Developer settings → Fine-grained tokens) right away.
- Keep this the only site published under your `username.github.io` (all sites there share browser
  storage), or move to a custom domain.
- Never put customer names/phones/addresses in orders; keep descriptions generic.
- Treat the "Estimativa do site" in WhatsApp messages as a hint: the customer can edit that text.

**What the site does:**
- Every page has a Content-Security-Policy: only the site's own scripts can run (no inline code, no
  eval, no outside scripts), and data can only be sent back to the site itself. The panel can
  additionally talk to `api.github.com` and nothing else. Even if something malicious got into a page,
  it could not load outside code or send a remembered token to another server.
- No third-party JavaScript at all: three.js is bundled in `js/vendor/`. The only outside resource is
  Google Fonts (CSS and font files, which cannot run code).
- Customer 3D files are read only in the customer's browser and never uploaded.
- The panel reads data files as JSON, never executes them, and only sends the token to GitHub.
- Text from the URL, forms and data files is escaped before being shown.

## Order tracking (v3)

The full flow:

1. Customer sends the order on WhatsApp (from the "Enviar" page).
2. You confirm price/date with them, then in the panel → **Pedidos** → type what will be printed →
   **Criar pedido e copiar mensagem** → **Publicar**.
3. Paste the copied message in the customer's WhatsApp. It contains the code and a direct link,
   e.g. `https://YOUR-USER.github.io/ita3d/pedido.html?c=ITA-7K3F`.
4. Whenever you change the status (imprimindo → pronto → entregue) and publish, the customer sees it
   on that page: a progress bar, how many orders are ahead of theirs, the estimated date, the pickup
   text when it's ready, and a WhatsApp button that mentions the code.

Customers can also type the code in "Meu pedido" (menu) or in the box on the home page; it accepts
`ita7k3f`, `7K3F`, etc. The page always loads the order list fresh, but GitHub Pages itself can take
1–2 minutes after a publish to show the change.

Anyone could open `data/pedidos.js` and see every order's code, description and status, which is
why it must never contain customer data.
