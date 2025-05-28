const fs = require('fs');
const path = require('path');

const EXCLUDED_DIRS = ['node_modules', '.git', '.vscode'];

function printTree(dir, prefix = '', isLast = true, output = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => !EXCLUDED_DIRS.includes(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  items.forEach((item, index) => {
    const isItemLast = index === items.length - 1;
    const connector = isItemLast ? '└── ' : '├── ';
    output.push(`${prefix}${connector}${item.name}`);
    if (item.isDirectory()) {
      const newPrefix = prefix + (isItemLast ? '    ' : '│   ');
      printTree(path.join(dir, item.name), newPrefix, isItemLast, output);
    }
  });

  return output;
}

// Generate tree
const treeLines = printTree(process.cwd());

// Save to file
fs.writeFileSync('tree.txt', treeLines.join('\n'), 'utf-8');

console.log('✅ Tree saved to tree.txt');
