import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Pattern 1: value={formData.something} onChange={... parseInt(e.target.value) ...}
  // We want to change value={X} to value={X || ""}
  // And parseInt(e.target.value) to e.target.value ? parseInt(e.target.value) : 0

  // Replace value={X} when it's near type="number"
  // Actually let's just globally replace `parseInt(e.target.value)` with `(e.target.value ? parseInt(e.target.value) : 0)` if it's not already handled.
  
  // Replace: value={formOrder} => value={formOrder || ""}
  // Replace: value={formData.display_order} => value={formData.display_order || ""}
  
  // It's safer to just do manual string replacements for the known ones.
  const replaces = [
    {
      file: 'src/pages/admin/PackageItems.tsx',
      from: `value={formOrder} onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}`,
      to: `value={formOrder || ""} onChange={(e) => setFormOrder(e.target.value ? parseInt(e.target.value) : 0)}`
    },
    {
      file: 'src/pages/admin/SellingPoints.tsx',
      from: `value={formData.display_order}\n                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}`,
      to: `value={formData.display_order || ""}\n                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value ? parseInt(e.target.value) : 0 })}`
    },
    {
      file: 'src/pages/admin/Testimonials.tsx',
      from: `value={formData.display_order}\n                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}`,
      to: `value={formData.display_order || ""}\n                      onChange={(e) => setFormData({ ...formData, display_order: e.target.value ? parseInt(e.target.value) : 0 })}`
    }
  ];

  let changed = false;
  for (const rep of replaces) {
    if (filePath.endsWith(rep.file)) {
      content = content.replace(rep.from, rep.to);
      changed = true;
    }
  }

  // Also universally replace `<Input type="number" {...field}`? I already did that.
  // Wait, I can just find `value={something}` immediately after `type="number"` and replace it if it's not `|| ""`
  // Let's just run regex on the file
  
  const regex = /type="number"\s+value=\{([^}]+?)\}\s+onChange=\{\(e\) => ([^{]+?)\(\{\s*\.\.\.([^,]+?),\s*([a-zA-Z0-9_]+):\s*parseInt\(e\.target\.value\)\s*\}\)\}/g;
  content = content.replace(regex, (match, val, setter, state, field) => {
    if (val.includes('||')) return match;
    return `type="number"
                      value={${val} || ""}
                      onChange={(e) => ${setter}({ ...${state}, ${field}: e.target.value ? parseInt(e.target.value) : 0 })}`;
  });

  const regex2 = /type="number"([^>]+)value=\{([^}]+?)\}\s+onChange=\{\(e\) => set([a-zA-Z0-9_]+)\(parseInt\(e\.target\.value\)\)\}/g;
  content = content.replace(regex2, (match, mid, val, setter) => {
    if (val.includes('||')) return match;
    return `type="number"${mid}value={${val} || ""} onChange={(e) => set${setter}(e.target.value ? parseInt(e.target.value) : 0)}`;
  });

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
