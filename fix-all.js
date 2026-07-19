import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Regex to find type="number" and the following value={someVar}
  // This will match type="number" anywhere inside a tag, and replace value={X} with value={X || ""}
  
  // It's easier to find `<Input ... type="number" ... value={X}` and `onChange`
  // Since we already did some, let's just globally replace `value={X}` with `value={X || ""}` where `X` is NOT containing `||` and it's inside an input with type="number"
  
  const tags = content.split(/(<Input[^>]+type="number"[^>]*>|<input[^>]+type="number"[^>]*>)/g);
  for (let i = 1; i < tags.length; i += 2) {
    let tag = tags[i];
    
    // Fix value
    tag = tag.replace(/value=\{([^}]+?)\}/, (match, p1) => {
      if (p1.includes('||') || p1.includes('?') || p1.includes('`') || p1 === '""' || p1 === "''") return match;
      return `value={${p1} || ""}`;
    });
    
    // Fix onChange
    tag = tag.replace(/onChange=\{\(e\) => ([^{]+?)\(\{\s*\.\.\.([^,]+?),\s*([a-zA-Z0-9_]+):\s*(parseInt|parseFloat|Number)\(e\.target\.value\)\s*(?:\|\|\s*[0-9]+)?\s*\}\)\}/, 
      (match, setter, state, field, parser) => {
        return `onChange={(e) => ${setter}({ ...${state}, ${field}: e.target.value ? ${parser}(e.target.value) : 0 })}`;
    });
    
    tag = tag.replace(/onChange=\{\(e\) => ([a-zA-Z0-9_]+)\((parseInt|parseFloat|Number)\(e\.target\.value\)\s*(?:\|\|\s*[0-9]+)?\)\}/, 
      (match, setter, parser) => {
        return `onChange={(e) => ${setter}(e.target.value ? ${parser}(e.target.value) : 0)}`;
    });

    tags[i] = tag;
  }
  
  content = tags.join('');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Fixed", filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      fixFile(fullPath);
    }
  }
}

walkDir('./src');
