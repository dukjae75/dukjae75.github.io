const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  Object.keys(replacements).forEach((search) => {
    content = content.replace(new RegExp(search, 'g'), replacements[search]);
  });
  fs.writeFileSync(filePath, content, 'utf8');
}

function main() {
  const pkg = readJSON(pkgPath);
  const version = pkg.version || '0.0.0';

  // app.js: replace APP_VERSION value
  const appJs = path.join(root, 'app.js');
  if (fs.existsSync(appJs)) {
    const old = "const APP_VERSION = 'v1.1.0';";
    const replacement = `const APP_VERSION = 'v${version}';`;
    replaceInFile(appJs, {
      [old.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')]: replacement
    });
    console.log(`Injected version into app.js: v${version}`);
  }

  // index.html: replace default text inside appVersionText span
  const indexHtml = path.join(root, 'index.html');
  if (fs.existsSync(indexHtml)) {
    const search = '<span id="appVersionText">v0.0.0</span>';
    const replace = `<span id="appVersionText">v${version}</span>`;
    replaceInFile(indexHtml, {
      [search.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')]: replace
    });
    console.log(`Injected version into index.html: v${version}`);
  }

  console.log('Version injection completed.');
}

main();
