# design-system.md

**Project:** Offline Estimate Bill Printer (Simple Billing / Kacha Bill)  
**Document status:** Approved — Streamlined Counter & Print Design System  

---

## 1. Design Philosophy

The application is built for fast counter usage. The design follows three core principles:

1. **Zero Clutter**: Only fields necessary to print the estimate are visible on screen. No distracting sidebar menus, charts, or unnecessary buttons.
2. **High-Speed Data Entry**: Tabular row structure, compact padding, and clear focus states so counter staff can type without pausing.
3. **Ink-Friendly Print Clarity**: The print stylesheet produces a clean, sharp, ink-saving paper bill with distinct borders and tabular alignment.

---

## 2. Colour Palette

### 2.1 On-Screen UI

| Element | Color / Class | Usage |
|---|---|---|
| **Background** | `#F8FAFC` (`slate-50`) | Soft neutral background that reduces eye strain. |
| **Card / Workspace** | `#FFFFFF` (`white`) | White sheet canvas mimicking paper bill layout. |
| **Borders** | `#E2E8F0` (`slate-200`) | Subtle dividers between table cells and form sections. |
| **Primary Action** | `#0284C7` / `#0369A1` (`sky-600` / `sky-700`) | Print button and active focus ring. |
| **Secondary Action** | `#64748B` (`slate-500`) | Clear / Reset and Settings buttons. |
| **Text Primary** | `#0F172A` (`slate-900`) | Headings, amounts, and item names. |
| **Text Secondary** | `#475569` (`slate-600`) | Field labels, table headers, and helper text. |
| **Total Highlight** | `#0F172A` bold text | Prominent display of the grand total amount. |

### 2.2 Print Output (Paper)

All colors are strictly converted to monochrome / grayscale for high contrast and ink economy:
- Background: Pure white (`#FFFFFF`).
- Text & Lines: Pure black (`#000000`) or dark gray (`#333333`).
- Borders: `1px solid #000000` or `#333333`.

---

## 3. Typography

- **UI Font**: System font stack (`Segoe UI`, `SF Pro`, -apple-system, sans-serif) for instant native loading.
- **Numbers / Totals**: `tabular-nums` enabled across all rate, quantity, and amount columns so decimal points line up vertically.
- **Scale**:
  - Grand Total Display: `24px` / `text-2xl` bold.
  - Section Headers: `16px` / `text-base` semibold.
  - Table Content & Inputs: `14px` / `text-sm` regular.
  - Helper & Disclaimer Text: `12px` / `text-xs`.

---

## 4. Layout Specifications

### 4.1 On-Screen Estimate Form
- **Max Width**: `800px` centered on screen (simulating standard document aspect ratio).
- **Header**: Business name prominently centered or left-aligned with estimate number and date on the right.
- **Customer Box**: 2 side-by-side inputs (`Customer Name`, `Phone / City`).
- **Items Grid**: Clean table layout with minimal input padding (`py-1.5 px-2`) for maximum rows in view.
- **Bottom Bar**: Sticky or prominent footer containing Subtotal, Discount, Grand Total, and primary `[Print Estimate]` button.

### 4.2 Print Layout Formats

#### Format A: Standard A4 / A5 (Quotation / Estimate Slip)
- Clean bordered box around the entire bill.
- Top section: Shop Name (bold 18pt), Address, Phone, Title ("ESTIMATE").
- Customer info bar: "M/s: [Customer Name]" and "Contact: [Phone]".
- Table with standard columns: `S.No`, `Item Description`, `Qty`, `Rate`, `Amount`.
- Bottom right: Subtotal, Discount, Grand Total in words & numbers.
- Bottom left: Terms & Conditions ("Estimate valid for 7 days / Subject to stock availability") and Authorized Signatory line.

#### Format B: 80mm Thermal Receipt
- Width fixed to `72mm` printable area.
- Centered shop name and phone.
- Dashed horizontal divider lines.
- Compact 3-column table (`Item`, `Qty x Rate`, `Total`).
- Bold grand total and thank-you footer.
