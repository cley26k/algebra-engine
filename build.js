// Ensambla un único HTML autocontenido en dist/.  Uso: node build.js
const fs = require('fs'), path = require('path');
const r = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const ORDER = ['core.js', 'groups.js', 'gfx.js', 'music.js', 'deco.js', 'critters.js', 'chars.js', 'kit.js', 'level1.js', 'scene2.js', 'scene3.js', 'scene4.js', 'scene5.js', 'scene6.js', 'scene7.js', 'scene8.js', 'briefs.js', 'comics.js', 'title.js', 'app.js'];
let html = r('index.template.html');
const scripts = ORDER.map(f => '<script>\n/* ---- ' + f + ' ---- */\n' + r(f) + '\n</script>').join('\n');
html = html.replace('<!--__SCRIPTS__-->', () => scripts);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'the-algebra-engine.html'), html);
const full = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' + html + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), full);
console.log('dist/the-algebra-engine.html', (html.length / 1024).toFixed(1) + ' KB');
