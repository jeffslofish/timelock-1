/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('dotenv').config();
require('@nomiclabs/hardhat-ethers');

const { MODE, TEST_API_URL, TEST_PRIVATE_KEY, PROD_API_URL, PROD_PRIVATE_KEY } =
  process.env;

const API_URL = MODE === 'test' ? TEST_API_URL : PROD_API_URL;
const PRIVATE_KEY = MODE === 'test' ? TEST_PRIVATE_KEY : PROD_PRIVATE_KEY;

module.exports = {
  solidity: '0.8.24',
  defaultNetwork: 'polygon',
  networks: {
    hardhat: {},
    polygon: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
};
