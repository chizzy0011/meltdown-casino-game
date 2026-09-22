/**
 * Compile MeltdownGame.sol -> artifacts/MeltdownGame.json (ABI + bytecode).
 *
 * Reproducible handoff artifact: run `npm run compile:contract`. Uses solc 0.8.30
 * (hoisted into the SDK workspace) and resolves the sibling ICasinoGameV2 import
 * from the canonical simulator/contracts path.
 *
 *   node deploy/compile.mjs
 */
import solc from 'solc';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const contractsDir = resolve(here, '../../../simulator/contracts');
const outDir = resolve(here, '../artifacts');
const NAME = 'MeltdownGame';

const findImports = (path) => {
  try { return { contents: readFileSync(resolve(contractsDir, path), 'utf8') }; }
  catch (e) { return { error: `not found: ${path}` }; }
};

const input = {
  language: 'Solidity',
  sources: { [`${NAME}.sol`]: { content: readFileSync(resolve(contractsDir, `${NAME}.sol`), 'utf8') } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (out.errors ?? []).filter(e => e.severity === 'error');
for (const w of (out.errors ?? []).filter(e => e.severity === 'warning')) {
  console.warn('WARN:', w.formattedMessage.split('\n')[0]);
}
if (errors.length) {
  for (const e of errors) console.error(e.formattedMessage);
  process.exit(1);
}

const c = out.contracts[`${NAME}.sol`][NAME];
const solcVersion = solc.version();
const artifact = {
  contractName: NAME,
  compiler: { name: 'solc', version: solcVersion, optimizer: { enabled: true, runs: 200 } },
  abi: c.abi,
  bytecode: '0x' + c.evm.bytecode.object,
  note: 'Constructor takes no arguments. Deploy, then hand the address to the Chain.wtf team for whitelisting.',
};

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, `${NAME}.json`), JSON.stringify(artifact, null, 2) + '\n');
console.log(`Wrote artifacts/${NAME}.json  (solc ${solcVersion}, bytecode ${c.evm.bytecode.object.length / 2} bytes, ${c.abi.filter(x => x.type === 'function').length} fns)`);
