import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// Shared commerce and navigation shell, with distinct static page documents.
const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const before = source.split('<main>')[0];
const after = source.split('</main>')[1];
const collection = source.match(/<section class="collection section-pad"[\s\S]*?<\/section>/)[0];
const newsletter = source.match(/<section class="newsletter section-pad"[\s\S]*?<\/section>/)[0];
function save(name, title, description, content) {
  const dir = new URL(`../${name}/`, import.meta.url);
  mkdirSync(dir, {recursive:true});
  const page = (before + '<main>' + content + newsletter + '</main>' + after)
    .replace('<body>', `<body data-page="${name}">`)
    .replace('<title>AETHEL | Menswear in motion</title>', `<title>${title} | AETHEL</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${description}"`);
  writeFileSync(new URL('index.html', dir), page);
}
save('collection', 'The collection', 'Three considered menswear essentials. Explore the complete AETHEL collection, choose your colour and find your fit.', collection.replace('class="collection section-pad"','class="collection section-pad page-collection"').replace('<h2 id="collection-title">','<h1 id="collection-title">').replace('rotation.</span></h2>','rotation.</span></h1>') + `
  <section class="collection-invitation"><img src="/images/campaign.webp" alt="Leather and tailoring in the sunlit AETHEL campaign" loading="lazy"/><div><span class="eyebrow">ANOTHER WAY TO SEE IT</span><h2>A wardrobe.<br>A whole <span class="serif-word">world.</span></h2><p>Step into the atelier. Move around the pieces.<br>Find a new perspective on your daily rotation.</p><a class="button button-dark" href="/atelier/">Enter the 3D atelier</a></div></section>`);
save('atelier', 'The 3D atelier', 'Step inside the AETHEL spatial wardrobe. Drag, rotate and explore our menswear collection in a real-time 3D installation.', `
  <section class="spatial-page section-pad">
    <div class="spatial-intro"><div><span class="eyebrow">THE SPATIAL WARDROBE / COLLECTION 01</span><h1>Form.<br>From every <span class="serif-word">angle.</span></h1></div><p>Three pieces. A different perspective.<br>Drag the room, choose a silhouette,<br>and make space for your own style.</p></div>
    <div class="atelier-stage"><img class="spatial-fallback" src="/images/jacket.webp" alt="The Field Jacket"/><canvas id="atelier-canvas" aria-label="Interactive 3D fashion carousel. Drag to rotate the collection."></canvas><span class="spatial-instruction">DRAG TO EXPLORE THE SPACE</span><button id="spatial-reset">Reset view</button></div>
    <div class="spatial-tabs" role="group" aria-label="Select a garment in the 3D atelier"><button class="active" data-look="0" aria-pressed="true">The Field Jacket</button><button data-look="1" aria-pressed="false">The Essential Knit</button><button data-look="2" aria-pressed="false">The Studio Trouser</button></div>
    <div class="spatial-product"><div><span class="eyebrow">YOUR SELECTED PIECE</span><h2 id="spatial-name">The Field Jacket</h2></div><span id="spatial-price">₹24,900</span><button class="button button-dark" id="spatial-shop" data-open-product="field">Make it yours</button></div>
  </section>
  <section class="atelier-notes section-pad"><article><span class="eyebrow">01 / MATERIAL</span><h2>A little texture.</h2><p>Supple leather. Soft merino. Fluid wool. A considered balance of weight, warmth and character.</p></article><article><span class="eyebrow">02 / MOVEMENT</span><h2>A little freedom.</h2><p>Relaxed silhouettes that make room for the way you move, and the way you make them your own.</p></article><article><span class="eyebrow">03 / PERSPECTIVE</span><h2>All you.</h2><p>A collection seen differently. Find your piece, choose your colour, and build a rotation that feels like you.</p></article></section>`);
