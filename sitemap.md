# sitemap.md

**Project:** Offline Estimate Bill Printer (Simple Billing / Kacha Bill)  
**Document status:** Approved — Streamlined & Minimalist Navigation  

---

## 1. Navigation Model

The application eliminates multi-page sidebars, nested menus, and complex route trees. The entire application operates from a **focused, single-screen workspace**.

- **No Multi-Level Routing**: The user is always on the estimate creation screen.
- **Top Bar**: Minimalist header showing application title, shop name, a **Settings** button (`⚙️`), and action triggers (`Print`, `Clear`).
- **Zero Distractions**: No customer list screens, no product management screens, no report dashboards.

---

## 2. Screen & Component Hierarchy

```text
Application Root
│
├── Main Estimate Screen (Single Page / Dashboard)
│     │
│     ├── Top Action Bar
│     │     ├── Shop Name & Status
│     │     ├── Quick Actions: [Print Estimate (Ctrl+P)] [Clear / New (Ctrl+N)]
│     │     └── Settings Trigger: [⚙️ Shop Settings]
│     │
│     ├── Estimate Header Block
│     │     ├── Bill Title ("ESTIMATE" / "QUOTATION" / "ESTIMATE MEMO")
│     │     ├── Estimate Number (#101, editable/auto-increment)
│     │     └── Date Picker / Field (Defaults to Today)
│     │
│     ├── Customer Details (Transient / Unsaved)
│     │     ├── Customer Name (Text Input)
│     │     └── Phone / Address / City (Text Input)
│     │
│     ├── Item Entry Table
│     │     ├── Header: S.No | Item Description | Qty | Rate | Amount | Action
│     │     ├── Dynamic Rows:
│     │     │     ├── Item Name input
│     │     │     ├── Qty input (numeric)
│     │     │     ├── Rate input (numeric)
│     │     │     ├── Line total (auto-calculated)
│     │     │     └── Delete row button
│     │     └── [+ Add Item] Button (or press Enter on last cell)
│     │
│     ├── Bill Summary Block
│     │     ├── Subtotal (Auto-calculated)
│     │     ├── Discount / Round-off input
│     │     ├── Grand Total (Prominent display)
│     │     └── Custom Terms / Note input
│     │
│     └── Print Output Preview Area (@media print)
│           └── Formatted clean paper view (A4 / A5 / 80mm Thermal)
│
└── Shop Settings Modal (Overlay Dialog)
      ├── Business / Store Name
      ├── Address & Contact / Phone
      ├── Default Estimate Header Title
      ├── Default Terms / Disclaimer Note
      ├── Preferred Print Format (A4 / A5 / Thermal 80mm)
      └── [Save] / [Cancel]
```

---

## 3. Keyboard Shortcuts

Designed specifically for rapid counter operation:

| Shortcut | Action |
|---|---|
| `Ctrl + P` | Print the current estimate bill |
| `Ctrl + N` | Clear all fields and start a new estimate |
| `Enter` (on rate field) | Add and focus a new line item row |
| `Tab` | Move smoothly between customer and item fields |
| `Esc` | Close Shop Settings modal / dismiss popups |
