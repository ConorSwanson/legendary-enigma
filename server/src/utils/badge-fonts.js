// Font CSS for SVG→PNG rendering via sharp/librsvg.
// Uses file:// paths to committed TTF files — more reliable than data: URIs
// across librsvg versions.
const path = require('path');
const FONT_DIR = path.join(__dirname, '../assets/fonts');

module.exports = `
@font-face {
  font-family: 'Alfa Slab One';
  font-style: normal;
  font-weight: 400;
  src: url('file://${path.join(FONT_DIR, 'alfa-slab-one.ttf')}') format('truetype');
}
@font-face {
  font-family: 'Oswald';
  font-style: normal;
  font-weight: 500;
  src: url('file://${path.join(FONT_DIR, 'oswald-500.ttf')}') format('truetype');
}
@font-face {
  font-family: 'Oswald';
  font-style: normal;
  font-weight: 600;
  src: url('file://${path.join(FONT_DIR, 'oswald-600.ttf')}') format('truetype');
}
`;
