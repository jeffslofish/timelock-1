//const API_URL = process.env.API_URL;
//const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = '0x893597C235F5bCac3D231C8a929c2397459c7E0d';

const API_URL =
  process.env.MODE === 'test'
    ? process.env.TEST_API_URL
    : process.env.PROD_API_URL;
const PRIVATE_KEY =
  process.env.MODE === 'test'
    ? process.env.TEST_PRIVATE_KEY
    : process.env.PROD_PRIVATE_KEY;

const ethers = require('ethers');

const contract = require('../artifacts/contracts/timelock.sol/TimeLock.json');

// provider - Alchemy
const alchemyProvider = new ethers.providers.JsonRpcProvider(API_URL);

// signer - you
const signer = new ethers.Wallet(PRIVATE_KEY, alchemyProvider);

// contract instance
const timelockContract = new ethers.Contract(
  CONTRACT_ADDRESS,
  contract.abi,
  signer,
);

async function main() {
  const message = await timelockContract.withdraw();
  console.log(message);
}

main();
