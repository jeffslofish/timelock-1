const util = require('util');

const WALLET_ADDRESS = '0x4c561A08B4FC1F89Eec3A553D60B17973378F2df';

// Calculate unlock time based on the current timestamp and lock period
function calculateUnlockTime(lockPeriodInSeconds) {
  const currentTimestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
  const unlockTime = currentTimestamp + lockPeriodInSeconds;
  return unlockTime;
}

async function main() {
  const TimeLock = await ethers.getContractFactory('TimeLock');

  const lockPeriodInSeconds = 60 * 3; // 3 min lock period
  const unlockTime = calculateUnlockTime(lockPeriodInSeconds);

  // Start deployment, returning a promise that resolves to a contract object
  const timelock = await TimeLock.deploy(WALLET_ADDRESS, unlockTime);
  console.log('Contract deploying to address:', timelock.address);

  console.log('contract deployment info ');
  console.log(
    util.inspect(timelock.deployTransaction, {
      showHidden: false,
      depth: null,
      colors: true,
    }),
  );

  try {
    await timelock.deployTransaction.wait();
    console.log('able to interact with contract now');
  } catch (err) {
    console.log('error with deploy waiting ' + err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
