import { readFileSync, writeFileSync } from 'fs';
const f = 'j:/PALLADIUM TRANSFERS/palladium-operations-hub/views/ReservasView.tsx';
let c = readFileSync(f, 'utf8');
const oldStr = "fallbackVehicle.plate.replace(/[^a-zA-Z0-9]/g, '')";
const newStr = 'fallbackVehicle.plate.trim()';
const found = c.includes(oldStr);
console.log('found:', found);
if (found) {
  c = c.replace(oldStr, newStr);
  writeFileSync(f, c, 'utf8');
  console.log('done');
}
