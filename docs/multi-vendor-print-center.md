# Multi-vendor print center

Admin order details now expose a dedicated print center above operational progress.

- Full order invoice opens the existing A4 invoice workflow for all stores.
- Select individual seller packages, clear the selection, or select up to 20 packages.
- Prepare parcel labels (100 × 150 mm) or packing slips (A4), inspect the previews, then print/save PDF on web or share PDF on native.
- Each package retains its own signed QR, products, address and collection amount; the parent order total is not repeated as each parcel's COD amount.
- Account, order, order version and selected packages reset the batch preview.

Validation: workspace build and six focused print tests passed. Full mobile type-check remains blocked by existing `PromoTiles.tsx` union-property errors (`tone`, `icon`). Browser/printer output has not been visually verified in this change. The reference's separate scanner-barcode export is not implemented by this change; signed QR parcel labels are available.
