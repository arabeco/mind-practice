import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npm run deck:register <deckId> [price]');
  console.error('Example: npm run deck:register familia_01 20');
  process.exit(1);
}

const deckId = args[0];
const price = args[1] ? parseInt(args[1], 10) : undefined;

const decksDir = path.join(__dirname, '..', 'src', 'data', 'decks');
const indexPath = path.join(decksDir, 'index.ts');
const deckJsonPath = path.join(decksDir, `${deckId}.json`);

// Check deck JSON exists
if (!fs.existsSync(deckJsonPath)) {
  console.error(`\x1b[31mDeck file not found: ${deckJsonPath}\x1b[0m`);
  console.error('Create the JSON file first, then run this script.');
  process.exit(1);
}

// Read current index
let indexContent = fs.readFileSync(indexPath, 'utf-8');

// Check if already registered
if (indexContent.includes(`'${deckId}'`) || indexContent.includes(`"${deckId}"`)) {
  console.log(`\x1b[33mDeck "${deckId}" is already registered in index.ts\x1b[0m`);
  process.exit(0);
}

// Generate camelCase variable name from deck_id
const varName = deckId.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

// 1. Add import after the last JSON import line
const importLines = indexContent.match(/^import .+ from '\.\/.*\.json';$/gm) || [];
if (importLines.length === 0) {
  console.error('\x1b[31mCould not find any JSON import lines in index.ts\x1b[0m');
  process.exit(1);
}
const lastImport = importLines[importLines.length - 1];
const newImport = `import ${varName} from './${deckId}.json';`;
indexContent = indexContent.replace(lastImport, `${lastImport}\n${newImport}`);

// 2. Add to ALL_DECKS array (before the closing ];)
indexContent = indexContent.replace(
  /(  livroAmaldicoado as unknown as Deck,\n)(];)/,
  `$1  ${varName} as unknown as Deck,\n$2`,
);

// 3. Add to DECK_UNLOCK_ORDER before the closing ];
indexContent = indexContent.replace(
  /('livro_amaldicoado',\n)(];)/,
  `$1  '${deckId}',\n$2`,
);

fs.writeFileSync(indexPath, indexContent);

console.log(`\x1b[32mRegistered "${deckId}" in index.ts\x1b[0m`);
console.log(`  - Import: ${newImport}`);
console.log(`  - Added to ALL_DECKS`);
console.log(`  - Added to DECK_UNLOCK_ORDER`);

if (price !== undefined) {
  const decksPagePath = path.join(__dirname, '..', 'src', 'app', 'decks', 'page.tsx');
  if (fs.existsSync(decksPagePath)) {
    let pageContent = fs.readFileSync(decksPagePath, 'utf-8');
    pageContent = pageContent.replace(
      /(livro_amaldicoado:\s*\d+,\n)(};)/,
      `$1  ${deckId}: ${price},\n$2`,
    );
    fs.writeFileSync(decksPagePath, pageContent);
    console.log(`  - Set price: ${price} fichas in DECK_PRICES`);
  }
}

console.log("\nDon't forget to run: npm run build");
