const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  // Replace standard padding patterns used for main containers
  content = content.replace(/mx-auto px-4/g, 'mx-auto px-6 md:px-8');
  content = content.replace(/w-full px-4/g, 'w-full px-6 md:px-8');
  
  // Special case if they had px-4 mx-auto
  content = content.replace(/px-4 mx-auto/g, 'px-6 md:px-8 mx-auto');

  if (content !== original) {
    fs.writeFileSync(file, content);
    changedFiles++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Updated ${changedFiles} files successfully.`);
