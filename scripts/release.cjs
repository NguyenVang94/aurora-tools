const fs = require('fs');
const path = require('path');

// Lấy version từ command line (vd: node release.js 2.2.1)
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('❌ Vui lòng nhập version mới! Ví dụ: npm run release 2.2.1');
  process.exit(1);
}

// 1. Cập nhật package.json
const pkgPath = path.join(__dirname, '../package.json');
let pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkgData.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2) + '\n');
console.log(`✅ Đã cập nhật package.json -> ${newVersion}`);

// 2. Cập nhật src-tauri/tauri.conf.json
const tauriConfPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
let tauriConfData = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConfData.version = newVersion;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConfData, null, 2) + '\n');
console.log(`✅ Đã cập nhật tauri.conf.json -> ${newVersion}`);

// 3. Cập nhật src-tauri/Cargo.toml
const cargoPath = path.join(__dirname, '../src-tauri/Cargo.toml');
let cargoData = fs.readFileSync(cargoPath, 'utf8');
// Dùng regex để tìm và thay thế dòng version = "..."
cargoData = cargoData.replace(/version\s*=\s*"[^"]+"/, `version = "${newVersion}"`);
fs.writeFileSync(cargoPath, cargoData);
console.log(`✅ Đã cập nhật Cargo.toml -> ${newVersion}`);

console.log('🎉 Xong! Bây giờ bạn có thể chạy: npm run tauri build');