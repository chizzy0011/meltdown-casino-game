/**
 * Deploy MeltdownGame from the committed artifact via viem.
 *
 * MeltdownGame has NO constructor args, so this is a one-shot deploy. Whitelisting
 * on CasinoGameFacet is a governance action performed by the Chain.wtf team — this
 * only publishes the bytecode and prints the address to hand off.
 *
 * Usage:
 *   node deploy/deploy.mjs --rpc-url <RPC> --private-key <0xKEY> [--chain-id <ID>]
 * or via env:
 *   RPC_URL=<RPC> PRIVATE_KEY=<0xKEY> node deploy/deploy.mjs
 *
 * Local test against the SDK simulator chain:
 *   node deploy/deploy.mjs --rpc-url http://127.0.0.1:8545 \
 *     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

function arg(flag, envKey) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return envKey ? process.env[envKey] : undefined;
}

const rpcUrl = arg('--rpc-url', 'RPC_URL');
let privateKey = arg('--private-key', 'PRIVATE_KEY');
const chainIdArg = arg('--chain-id', 'CHAIN_ID');

if (!rpcUrl || !privateKey) {
  console.error('Missing required args.\n  node deploy/deploy.mjs --rpc-url <RPC> --private-key <0xKEY> [--chain-id <ID>]');
  process.exit(1);
}
if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;

const here = dirname(fileURLToPath(import.meta.url));
const artifact = JSON.parse(readFileSync(resolve(here, '../artifacts/MeltdownGame.json'), 'utf8'));

const account = privateKeyToAccount(privateKey);

const transport = http(rpcUrl);
const probe = createPublicClient({ transport });
const chainId = chainIdArg ? Number(chainIdArg) : await probe.getChainId();
const chain = defineChain({
  id: chainId,
  name: `chain-${chainId}`,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

const publicClient = createPublicClient({ chain, transport });
const wallet = createWalletClient({ account, chain, transport });

console.log(`Deployer : ${account.address}`);
console.log(`Chain    : ${chainId}`);
console.log(`RPC      : ${rpcUrl}`);
console.log('Deploying MeltdownGame …');

const hash = await wallet.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  args: [],
});
console.log(`Tx       : ${hash}`);

const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (!receipt.contractAddress) {
  console.error('Deployment produced no contract address.');
  process.exit(1);
}

console.log(`\n✅ MeltdownGame deployed`);
console.log(`   address : ${receipt.contractAddress}`);
console.log(`   block   : ${receipt.blockNumber}`);
console.log(`\nHand this address to the Chain.wtf team for whitelisting on CasinoGameFacet.`);
