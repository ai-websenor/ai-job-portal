const pdf = require('pdf-parse');
console.log('Type of pdf:', typeof pdf);
console.log('Keys:', JSON.stringify(Object.keys(pdf)));
console.log('Is __esModule:', pdf.__esModule);
if (typeof pdf === 'function') {
  console.log('pdf is a function');
} else if (pdf.default && typeof pdf.default === 'function') {
  console.log('pdf.default is a function');
} else {
  console.log('Neither pdf nor pdf.default is a function');
}
