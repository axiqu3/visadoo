const fs = require('fs');
const PNG = require('pngjs').PNG;

const data = fs.readFileSync('assets/form-templates/denmark-rendered/page-2.png');
const png = PNG.sync.read(data);

function printSlice(yStart, yEnd, xStart, xEnd) {
  console.log(`\n--- Slice Y: ${yStart} to ${yEnd}, X: ${xStart} to ${xEnd} ---`);
  for (let y = yStart; y <= yEnd; y++) {
    let line = '';
    for (let x = xStart; x <= xEnd; x++) {
      const idx = (png.width * y + x) << 2;
      const r = png.data[idx];
      const g = png.data[idx+1];
      const b = png.data[idx+2];
      const brightness = (r + g + b) / 3;
      if (brightness < 120) line += '#';
      else if (brightness < 200) line += ':';
      else line += '.';
    }
    console.log(`${y}: ${line}`);
  }
}

printSlice(740, 880, 50, 450);
