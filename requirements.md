# requirements.md

**Project:** Offline Estimate Bill Printer (Simple Billing / Kacha Bill)  
**Document status:** Approved — Streamlined & Minimalist Specification  

---

## 1. Product Purpose

### 1.1 What the Software Does
A minimalist, lightweight desktop application designed for local shops, distributors, traders, and service counters to **quickly create and print estimate bills (rough bills / quotations / kacha bills)**.

The software is intentionally stripped of all complexity:
- **Instant Estimate Creation**: Open the app and start typing immediately.
- **No Customer Database**: Customer name and phone number are entered directly on the bill as optional transient fields. They are **not** saved into any customer master, address book, or CRM.
- **Fast Line Item Entry**: Add items with Name/Description, Quantity, and Rate. The row total is calculated automatically.
- **One-Click Printing**: Press Print (or `Ctrl+P`) to instantly trigger a clean, ink-efficient printout on standard A4, A5, or thermal paper.
- **Clear & Next**: Clear the form with one click to begin the next customer's estimate immediately.
- **Shop Profile**: Set your shop/business name, address, contact, and optional estimate note once; it automatically appears on all printouts.
- **100% Offline & Private**: Runs completely on the local PC without internet, logins, subscriptions, or cloud dependencies.

### 1.2 What Problem It Solves
Most billing software is bloated with complex GST calculations, mandatory customer registration, stock/inventory tracking, tax ledgers, and recurring subscription fees. 

Counter staff and shop owners who only need to give a customer a quick estimate or quotation find existing tools too slow, complicated, and restrictive. This application replaces manual carbon-copy paper estimate pads with a rapid, accurate, and clean digital printer.

### 1.3 What This Software Intentionally Does NOT Do (Non-Goals)
To keep the application as simple as possible, the following features are explicitly excluded:
- **No Final Tax Invoices**: Does not handle complex GSTIN filing, E-way bills, or government compliance forms.
- **No Customer Master / Ledger**: No customer database, debt tracking, or customer account histories.
- **No Inventory / Stock Tracking**: Does not track stock levels, batch numbers, or reorder alerts.
- **No Complex Accounting**: No debit/credit ledgers, balance sheets, or tax audit reports.
- **No Mandatory Online Connectivity**: No cloud sync, no tracking, and no external accounts.

---

## 2. Target Users

- **Counter Sales & Retailers**: Kirana stores, hardware counters, building materials, garment shops, and auto-parts dealers giving quick price quotations.
- **Wholesalers & Distributors**: Issuing rapid estimate slips for loading orders before final settlement.
- **Service Providers & Repair Shops**: Electricians, mechanics, fabricators, and carpenters providing quick work estimates.

---

## 3. Core Features & User Workflow

### 3.1 The Main Estimate Workspace
A single, clean screen with zero visual noise:

1. **Header Section**:
   - Displays configured Shop Name, Address, and Phone.
   - Estimate Number (auto-incrementing simple counter or editable text).
   - Date (defaults to today's date, editable).

2. **Customer Information (Transient)**:
   - Customer Name (optional text field).
   - Customer Contact / City (optional text field).
   - *Note: These fields are printed on the bill but are not stored in any customer database.*

3. **Line Items Grid**:
   - Columns: `#`, `Item Description`, `Qty`, `Rate`, `Amount`, `Actions`.
   - Keyboard Navigation: `Enter` or `Tab` automatically moves to the next field or creates a new row.
   - Instant calculation: `Amount = Qty × Rate`.
   - Ability to remove rows or clear the grid.

4. **Summary & Calculation**:
   - Subtotal (sum of all line item amounts).
   - Optional Discount / Adjustment field (+/- amount or %).
   - Grand Total (prominently highlighted).
   - Optional Footer Note (e.g., *"Estimate valid for 7 days"*, *"Subject to stock availability"*, *"This is an estimate, not a tax invoice"*).

5. **Action Controls**:
   - **Print Estimate (`Ctrl + P`)**: Formats the bill and triggers the system print dialog or direct thermal print.
   - **Save as PDF**: Optional direct PDF generation.
   - **New / Clear (`Ctrl + N`)**: Resets customer fields and line items for the next estimate.
   - **Shop Settings (`Gear Icon`)**: Opens a lightweight dialog to update shop header details.

### 3.2 Shop Settings (One-Time Setup)
A simple modal dialog saved in local application preferences:
- Business / Shop Name
- Subtitle / Tagline
- Address line(s)
- Phone / WhatsApp Number
- Default Footer Disclaimer / Terms
- Default Paper Size Preference (A4, Half A4 / A5, or 80mm Thermal Receipt)

---

## 4. Quality & Usability Requirements

- **Speed**: Cold start in under 2 seconds. Zero lag while typing.
- **Keyboard-First**: A counter clerk can type a complete 5-item estimate and trigger print entirely using `Tab`, `Enter`, and number keys without touching the mouse.
- **Offline Durability**: Completely self-contained; runs permanently with network adapters disabled.
- **Ink-Friendly Print Layout**: Crisp black-and-white print styling that looks professional on both cheap laser printers and thermal receipt rolls.
