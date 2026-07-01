const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Doc version hien tai tu package.json (da duoc scripts/release.cjs cap nhat)
const pkgPath = path.join(__dirname, '../package.json');
const { version } = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const nsisDir = path.join(__dirname, '../src-tauri/target/release/bundle/nsis');
const installerPath = path.join(nsisDir, `Aurora_${version}_x64-setup.exe`);

if (!fs.existsSync(installerPath)) {
  console.error(`❌ Không tìm thấy ${installerPath}`);
  console.error('   -> Chạy "npm run tauri build" trước để tạo file cài đặt gốc.');
  process.exit(1);
}

const makensisCandidates = [
  path.join(process.env.LOCALAPPDATA || '', 'tauri', 'NSIS', 'makensis.exe'),
  'makensis',
];
const makensis = makensisCandidates.find((p) => p === 'makensis' || fs.existsSync(p));

const launcherScript = path.join(__dirname, '../src-tauri/launcher/launcher.nsi');
const outFile = `Cai-dat-Aurora_${version}.exe`;
const outPath = path.join(nsisDir, outFile);

console.log(`🚀 Đang build launcher one-click cho Aurora ${version}...`);
execFileSync(
  makensis,
  [
    `/DINSTALLER_PATH=${installerPath}`,
    `/DOUT_FILE=${outPath}`,
    launcherScript,
  ],
  { stdio: 'inherit' }
);

console.log(`✅ Đã tạo: ${outPath}`);
console.log('   -> Upload file này lên GitHub Release cùng với/thay cho file setup.exe gốc.');
