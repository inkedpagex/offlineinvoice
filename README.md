# 🧾 Estimate Bill Printer (Offline Desktop Application)

An ultra-fast, offline-first Windows desktop application built for shops, traders, and small businesses to generate clean, compact **Estimate Bills ("Kacha Bill" / Quotations)** with zero ink waste and instant local persistence.

![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue)
![Architecture](https://img.shields.io/badge/Stack-Electron%20%7C%20React%20%7C%20Vite%20%7C%20TailwindCSS-purple)
![Offline](https://img.shields.io/badge/Database-100%25%20Offline%20(No%20Internet)-green)
![License](https://img.shields.io/badge/License-MIT-orange)

---

## ✨ Features

- **⚡ 100% Offline & Plug-and-Play:** Runs directly on your Windows PC without requiring internet, cloud accounts, or complicated database server installations (like MySQL/PostgreSQL).
- **🖨️ Pure Black & White (Toner & Ink Saving):** Clean, professional high-contrast layout designed specifically to use minimum printer toner/ink.
- **📄 Multi-Format Printing:**
  - **A5 Slip:** Compact voucher/slip size.
  - **A4 Full Page:** Standard full-sheet invoice.
  - **Thermal (80mm):** Continuous roll receipt for POS thermal printers.
- **📦 Pre-Loaded Product Catalog:** Comes pre-packaged with 78 wholesale FMCG/PCP products (name, MRP, rate, packaging units).
- **➕ Product Management:** Add, edit, search, or delete products anytime with permanent local persistence.
- **🔍 Instant Autocomplete:** Simply start typing a product name in the bill table to get live suggestions with price and unit auto-fill.
- **📜 Past Bills History Database:** Automatically logs past estimate bills (Estimate No like EST-101, customer name, phone, date, items, amount). Easily search, re-load, or re-print any past bill.
- **🔄 1-Click Backup & Restore (Data Migration):** Export your complete database (all products, shop profile, and history) into a single .json file to move to another PC via pen drive or email.
- **⌨️ Keyboard Shortcuts:**
  - Ctrl + P : Print Bill & auto-save to history.
  - Ctrl + N : Save current and start a new clean estimate bill.
  - Enter on Rate field: Automatically creates and focuses the next item row.
- **🗑️ Complete Windows Uninstaller:** Standard NSIS uninstaller cleanly removes desktop shortcuts, start menu items, and files when uninstalled via Windows Settings / Control Panel.

---

## 🚀 For Users: Download & Install (.exe)

If you just want to use the application on your computer:

1. Download the latest **Estimate Bill Printer Setup 1.0.0.exe** from the [Releases](https://github.com/) tab.
2. Double-click the installer and follow the standard Windows setup wizard (Next -> Install).
3. An **"Estimate Bill Printer"** shortcut will automatically appear on your Desktop.
4. Launch and start creating estimate bills immediately!

### How to Uninstall:
- Go to Windows **Settings** → **Apps** → **Installed Apps** (or **Control Panel** → **Programs and Features**).
- Find **Estimate Bill Printer** and click **Uninstall**.
- The app and desktop shortcuts will be completely removed from your system.

---

## 💻 For Developers: Running from Source

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- Windows 10 or 11

### 1. Clone the repository
\\\ash
git clone https://github.com/<your-username>/offline-estimate-printer.git
cd offline-estimate-printer
\\\

### 2. Install dependencies
\\\ash
npm install
\\\

### 3. Run in Development Mode
\\\ash
npm run electron:start
\\\

### 4. Build Standalone Windows Installer (.exe)
\\\ash
npm run dist:win
\\\
The generated setup installer will be placed in the dist-release/ folder.

---

## 🗄️ Why Local Storage (Chromium LevelDB) instead of MySQL?

| Feature | Built-in Offline Storage (LevelDB) | Traditional MySQL Server |
|---|---|---|
| **Zero Installation** | ✅ Works instantly out of the box on any Windows PC. | ❌ Requires user to install MySQL server, configure ports, root passwords, and background services. |
| **RAM & CPU Footprint** | ✅ Minimal, embedded directly in the app. | ❌ MySQL server consumes 300MB-800MB RAM continuously in background. |
| **Portability** | ✅ 1-click JSON backup file transfers to any PC via Pen Drive. | ❌ Complex SQL dumps, database user permissions, and import scripts required. |
| **Offline Reliability** | ✅ Never fails due to database port conflicts, firewalls, or service crashes. | ❌ Often fails if Windows updates reset services or port 3306 is occupied. |

---

## 📄 License

This project is licensed under the MIT License.
