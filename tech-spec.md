# tech-spec.md

**Project:** Offline Estimate Bill Printer (Simple Billing / Kacha Bill)  
**Document status:** Approved — Lightweight & Minimalist Technical Specification  

---

## 1. Architecture Overview

The system is designed to be lightweight, instant-starting, and completely self-contained.

```text
┌────────────────────────────────────────────────────────┐
│  Windows Desktop Application (Electron + Vite + React) │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Renderer Process (Pure Client-Side React)       │  │
│  │                                                  │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  Estimate Workspace UI                     │  │  │
│  │  │  - Single screen state (React useState)    │  │  │
│  │  │  - Fast keyboard shortcuts (Enter/Tab)     │  │  │
│  │  │  - Instant calculations (Subtotal, Total)  │  │  │
│  │  └──────────────────────┬─────────────────────┘  │  │
│  │                         │                        │  │
│  │  ┌──────────────────────▼─────────────────────┐  │  │
│  │  │  Print Engine (@media print CSS)           │  │  │
│  │  │  - Crisp black & white print layout        │  │  │
│  │  │  - Direct window.print() execution         │  │  │
│  │  │  - Supports A4, A5, and 80mm Thermal rolls │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                                                  │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  Local Preferences (localStorage)          │  │  │
│  │  │  - Shop Name, Phone, Address               │  │  │
│  │  │  - Next Estimate Number counter            │  │  │
│  │  │  - Preferred paper format                  │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions:
1. **Zero Database Overhead**: No SQLite tables, no Prisma migrations, and no ORM layers. The app maintains no persistent customer database.
2. **Instant Rendering**: Loads in less than 1 second.
3. **Native Print Fidelity**: Utilizes Chromium's robust print rendering pipeline with tailored `@media print` CSS rules, producing sharp, ink-efficient printouts on any Windows-configured printer without needing external PDF rendering binaries.

---

## 2. Technology Stack

| Concern | Technology | Justification |
|---|---|---|
| **Desktop Shell** | Electron | Cross-platform desktop runtime for Windows with access to native silent/system print dialogs. |
| **Frontend Framework** | React (via Vite) | Fast build, hot reload during development, and minimal runtime overhead. |
| **Styling** | Tailwind CSS | Utility-first styling with dedicated print utilities (`print:hidden`, `print:block`, etc.). |
| **State Management** | React `useState` / `useReducer` | Entire bill state lives in memory; resets cleanly between customers. |
| **Persistent Storage** | `localStorage` | Stores only shop configuration (Store Name, Address, Contact, Default Terms, Paper Size). |
| **Icons** | Lucide React | Lightweight SVG icons for print, clear, and settings buttons. |

---

## 3. Data Models (TypeScript Interfaces)

```typescript
// Shop profile saved in local preferences
export interface ShopProfile {
  name: string;
  tagline?: string;
  address: string;
  phone: string;
  estimateTitle: string; // e.g. "ESTIMATE" or "QUOTATION"
  defaultTerms?: string; // e.g. "This is an estimate, not a tax invoice"
  paperFormat: 'A4' | 'A5' | 'thermal80';
}

// Single line item inside the active estimate
export interface EstimateItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
  amount: number; // auto-calculated: qty * rate
}

// Active estimate in memory (transient, no database saving required)
export interface ActiveEstimate {
  estimateNumber: string;
  date: string;
  customerName: string;   // transient text
  customerContact: string; // transient text
  items: EstimateItem[];
  discount: number;
  subtotal: number;
  grandTotal: number;
  notes: string;
}
```

---

## 4. Calculation Logic

All financial values are computed instantaneously in the UI:

$$\text{Line Item Amount} = \text{Qty} \times \text{Rate}$$

$$\text{Subtotal} = \sum_{i=1}^{n} \text{Amount}_i$$

$$\text{Grand Total} = \max(0, \text{Subtotal} - \text{Discount})$$

- Amounts are rounded to 2 decimal places for display.
- Inputs handle decimals smoothly (e.g., `1.5 kg` at `₹45.00`).

---

## 5. Printing & CSS Print Layout

The print workflow relies on CSS `@media print` rules to instantly transform the on-screen form into a clean, professional paper slip:

```css
@media print {
  /* Hide application controls, buttons, and settings */
  .no-print, nav, button, .action-bar {
    display: none !important;
  }

  /* Optimize layout for paper */
  body, .print-container {
    background: #ffffff !important;
    color: #000000 !important;
    font-size: 12pt;
    margin: 0;
    padding: 0;
  }

  /* Crisp borders and tabular numbers */
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid #333333;
    padding: 4px 8px;
  }
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
}
```

### Supported Paper Sizes:
- **A4 (Standard)**: Standard full-page quotation format with shop header, customer box, itemized table, and signature line.
- **A5 / Half A4**: Compact landscape or portrait half-page slip.
- **80mm Thermal Receipt**: Continuous roll format with bold shop name, condensed item rows, and summary totals.
