#!/bin/sh
# Downloads the files the page would otherwise borrow from other servers, so the site is self-contained:
# the storage photo and full aerial film from the old newcoastre.com, and the map's code and US outline.
# Run once from Terminal:  sh tools/fetch-old-site-assets.sh
set -e
cd "$(dirname "$0")/.."
mkdir -p assets/img assets/video assets/vendor
curl -fL -o assets/img/storage-aerial.jpg https://newcoastre.com/wp-content/uploads/2026/05/GettyImages-1177905075.jpg
curl -fL -o assets/video/aerial-film.mp4 https://newcoastre.com/wp-content/uploads/2026/05/newnew-1778778843452754.mp4
curl -fL -o assets/vendor/d3-array.min.js https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js
curl -fL -o assets/vendor/d3-geo.min.js https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js
curl -fL -o assets/vendor/topojson-client.min.js https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js
curl -fL -o assets/vendor/states-albers-10m.json https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-albers-10m.json
ls -lh assets/img/storage-aerial.jpg assets/video/aerial-film.mp4 assets/vendor
echo "Done. The site no longer depends on the old newcoastre.com or a CDN."
