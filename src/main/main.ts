/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { cache } from 'webpack';
const { ethers } = require('hardhat');
const Store = require('electron-store');

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
  const contractAddress = store.get('contract_address');

  console.log('on contract address: ', contractAddress);
  event.reply('contractAddress', contractAddress);
});

ipcMain.on('deploy', async (event, arg) => {
  const [walletAddress] = arg;

  const msgTemplate = (pingPong: string) => `${pingPong}`;
  console.log(msgTemplate(arg));

  // Calculate unlock time based on the current timestamp and lock period
  function calculateUnlockTime(lockPeriodInSeconds: number) {
    const currentTimestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    const unlockTime = currentTimestamp + lockPeriodInSeconds;
    return unlockTime;
  }

  const TimeLock = await ethers.getContractFactory('TimeLock');

  const lockPeriodInSeconds = 60 * 3; // 3 min lock period
  const unlockTime = calculateUnlockTime(lockPeriodInSeconds);

  // Start deployment, returning a promise that resolves to a contract object
  const timelock = await TimeLock.deploy(walletAddress, unlockTime);
  console.log('Contract deployed to address:', timelock.address);

  store.set('contract_address', timelock.address);
  event.reply('deploy', msgTemplate(timelock.address));
});

ipcMain.on('withdraw', async (event, arg) => {
  const API_URL = process.env.API_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const [CONTRACT_ADDRESS] = arg;

  console.log('contract address: ', CONTRACT_ADDRESS);

  const contract = require('../../artifacts/contracts/timelock.sol/TimeLock.json');

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

  try {
    await timelockContract.withdraw();
  } catch (msg) {
    event.reply('withdraw', msg);
  }

  event.reply('withdraw', 'Withdraw complete');
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
    width: 1024,
    height: 728,
    resizable: false,
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
