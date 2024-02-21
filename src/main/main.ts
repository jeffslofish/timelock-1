/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
const util = require('util');
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
const { ethers } = require('hardhat');
require('@nomiclabs/hardhat-etherscan');
const Store = require('electron-store');

const API_URL =
  process.env.MODE === 'test'
    ? process.env.TEST_API_URL
    : process.env.PROD_API_URL;
const PRIVATE_KEY =
  process.env.MODE === 'test'
    ? process.env.TEST_PRIVATE_KEY
    : process.env.PROD_PRIVATE_KEY;

const store = new Store();

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('contractAddress', async (event, arg) => {
  const data = store.get('data');

  if (data) {
    console.log('data: ', data);
    event.reply('contractAddress', data);
  }
});

ipcMain.on('fetchTip', async (event, arg) => {
  const TimeLock = await ethers.getContractFactory('TimeLock');

  try {
    const alchemyProvider = new ethers.providers.JsonRpcProvider(API_URL);
    const feeData = await alchemyProvider.getFeeData();
    console.log('feeData: ');
    // {
    //   lastBaseFeePerGas: BigNumber { value: "43790869015" },
    //   maxFeePerGas: BigNumber { value: "89081738030" },
    //   maxPriorityFeePerGas: BigNumber { value: "1500000000" },
    //   gasPrice: BigNumber { value: "73790869015" }
    //gasPrice: new BigNumber('56024555897');
    // }
    console.log(
      util.inspect(feeData, {
        showHidden: false,
        depth: null,
        colors: true,
      }),
    );

    const tipGwei = ethers.utils.formatUnits(feeData.maxFeePerGas, 'gwei');
    console.log('tipgwei: ' + tipGwei);

    event.reply('fetchTip', [true, tipGwei]);
  } catch (err) {
    console.log('error fetching tip ' + err);
  }
});

ipcMain.on('deploy', async (event, arg) => {
  const [walletName, walletAddress, releaseTime, tip] = arg;

  const msgTemplate = (pingPong: string) => `${pingPong}`;
  console.log(msgTemplate(arg));

  const TimeLock = await ethers.getContractFactory('TimeLock');

  // Start deployment, returning a promise that resolves to a contract object
  try {
    const alchemyProvider = new ethers.providers.JsonRpcProvider(API_URL);
    const feeData = await alchemyProvider.getFeeData();
    const maxFeePerGas = ethers.utils.formatUnits(feeData.maxFeePerGas, 'gwei');

    const overrides = {
      maxPriorityFeePerGas: ethers.utils.parseUnits(tip.toString(), 'gwei'),
      maxFeePerGas: ethers.utils.parseUnits((tip + 10).toString(), 'gwei'),
    };

    //   lastBaseFeePerGas: BigNumber { value: "32276631733" },
    //        maxFeePerGas: BigNumber { value: "66053263466" },
    // maxPriorityFeePerGas: BigNumber { value: "1500000000" },
    //            gasPrice: BigNumber { value: "62276631733" }

    const timelock = await TimeLock.deploy(
      walletAddress,
      releaseTime,
      overrides,
    );
    console.log('deploying');
    console.log('contract deployment info ');
    console.log(
      util.inspect(timelock.deployTransaction, {
        showHidden: false,
        depth: null,
        colors: true,
      }),
    );

    await timelock.deployTransaction.wait();
    console.log(
      'Contract deployed to address and ready for interaction:',
      timelock.address,
    );

    if (store.get('data')) {
      store.set('data', [
        ...store.get('data'),
        {
          walletName: walletName,
          address: timelock.address,
          releaseTime: releaseTime,
          balance: 0,
        },
      ]);
    } else {
      store.set('data', [
        {
          walletName: walletName,
          address: timelock.address,
          releaseTime: releaseTime,
          balance: 0,
        },
      ]);
    }

    event.reply('deploy', [true, walletName, timelock.address, releaseTime]);
  } catch (error) {
    event.reply('deploy', [false, error]);
  }
});

ipcMain.on('withdraw', async (event, arg) => {
  const [addresses, tip] = arg;

  console.log('API_URL ' + API_URL);
  console.log('contract addresses: ', addresses);

  const contract = require('../../artifacts/contracts/timelock.sol/TimeLock.json');

  // provider - Alchemy
  const alchemyProvider = new ethers.providers.JsonRpcProvider(API_URL);

  // signer - you
  const signer = new ethers.Wallet(PRIVATE_KEY, alchemyProvider);

  for (let i = 0; i < addresses.length; i++) {
    // contract instance
    const timelockContract = new ethers.Contract(
      addresses[i],
      contract.abi,
      signer,
    );

    const overrides = {
      maxPriorityFeePerGas: ethers.utils.parseUnits(tip.toString(), 'gwei'),
      maxFeePerGas: ethers.utils.parseUnits((tip + 10).toString(), 'gwei'),
    };

    try {
      console.log('withdrawing on address: ' + addresses[i]);
      const tx = await timelockContract.withdraw(overrides);
      console.log('withdrawing....');
      event.reply('withdraw', [true, 'withdrawing....']);
      console.log(
        util.inspect(tx, {
          showHidden: false,
          depth: null,
          colors: true,
        }),
      );

      await tx.wait();
      console.log('withdraw complete');
      event.reply('withdraw', [true, 'Withdraw complete']);
    } catch (msg) {
      console.log('withdraw NOT successful ' + msg);
      event.reply('withdraw', [false, msg]);
    }
  }
});

ipcMain.on('checkBalance', async (event, arg) => {
  const contracts = arg;

  const api =
    process.env.MODE === 'test'
      ? 'https://api-testnet.polygonscan.com/api'
      : 'https://api.polygonscan.com/api';

  const getPriceApi = `${api}?module=stats&action=maticprice&apikey=${process.env.POLYGONSCAN_API_KEY}`;

  let price = 0;

  try {
    const response = await fetch(getPriceApi);
    if (response.ok) {
      const result = await response.json();
      price = result.result.maticusd;
      console.log(result);
    } else {
      console.log('response for getting price not ok' + response);
    }
  } catch (err) {
    console.log(err);
    event.reply('checkBalance', [false, err]);
  }

  for (let i = 0; i < contracts.length; i++) {
    const contractAddress = contracts[i];

    console.log('checking balance for ' + contractAddress);

    const getBalanceApi = `${api}?module=account&action=balance&address=${contractAddress}&apikey=${process.env.POLYGONSCAN_API_KEY}`;

    // Start deployment, returning a promise that resolves to a contract object
    try {
      const response = await fetch(getBalanceApi);

      if (response.ok) {
        const result = await response.json();
        console.log(result);

        if (store.get('data')) {
          const currStore = store.get('data');

          const updatedStore = currStore.map((item: any) => {
            if (item.address == contractAddress) {
              return { ...item, balance: result.result };
            }
            return item;
          });

          store.set('data', updatedStore);
        } else {
          console.log('should never get here!!!!');
          // store.set('data', [
          //   { address: contractAddress, balance: result.result },
          // ]);
        }

        // console.log('replying ' + contractAddress + ' ' + result.result);
        // event.reply('checkBalance', [true, contractAddress, result.result]);
      } else {
        console.log('response not ok');
        // event.reply('checkBalance', [false, response]);
      }
    } catch (err) {
      console.log('caught error ' + err);
      // event.reply('checkBalance', [false, err]);
    }
  }

  const data = store.get('data');
  console.log('replying ' + data);
  event.reply('checkBalance', [true, data, price]);
});

ipcMain.on('updateData', async (event, arg) => {
  const data = arg;

  console.log('updating data to :', data);
  store.set('data', data);
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1450,
    height: 920,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.maximize();
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
