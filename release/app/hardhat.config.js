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
  solidity: '0.8.20',
  defaultNetwork: 'polygon_mumbai',
  networks: {
    hardhat: {},
    polygon_mumbai: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
};
