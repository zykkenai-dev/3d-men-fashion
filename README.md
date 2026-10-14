# AETHEL

A complete menswear concept built with Vite, JavaScript, CSS, GSAP, Lenis and Three.js.

```bash
npm install
npm run dev
```

Open http://localhost:5187. `npm run build` generates `dist/`.

Photographic garments lead the collection and layered hero. Product dialogs include an optional interactive 3D silhouette view. The site supports reduced motion, phone layouts, keyboard navigation, size guides, filters, color selection, bag quantities, browser persistence and a demonstration checkout.

This is a concept store. It collects no payment, sends no newsletter email and ships no products. Checkout input stays in memory; bag contents and newsletter interest stay in browser storage.

Original assets were generated with built-in ImageGen. Optimized files are in `public/images/`; full transparent originals are retained in `design-assets/`.

Asset briefs: a tactile tobacco leather jacket with natural folds and brushed hardware; a softly draped oatmeal merino crewneck; charcoal pleated wool trousers; a menswear editorial against sunlit Mediterranean travertine. All images exclude logos and embedded text.

Design research: [Zegna](https://borninoasi.zegna.com/experience/oasi/), [Moncler by Me](https://www.ramonprieto.studio/digital/moncler), [LEMAIRE](https://www.lemaire.fr/fr/pages/defile-printemps-ete-2025), and [Vyking](https://www.vyking.io/).

Verified in the browser: 390px phone layout without horizontal overflow, navigation, category filters, loaded garment images, optional 3D previews without console errors, nested size guides, adding/removing products, quantity totals, bag persistence after reload, demo checkout and newsletter confirmation. Production compilation and source syntax checks pass.
