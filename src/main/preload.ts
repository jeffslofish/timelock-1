// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type DeployChannel = 'deploy';
export type WithdrawChannel = 'withdraw';
export type ContractAddressChannel = 'contractAddress';
export type CheckBalanceChannel = 'checkBalance';
export type UpdateDataChannel = 'updateData';

const electronHandler = {
  ipcRenderer: {
    sendDeployMessage(channel: DeployChannel, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    sendWithdrawMessage(channel: WithdrawChannel, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    sendContractAddressMessage(
      channel: ContractAddressChannel,
      ...args: unknown[]
    ) {
      ipcRenderer.send(channel, ...args);
    },
    sendCheckBalanceMessage(channel: CheckBalanceChannel, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    sendUpdateDataMessage(channel: UpdateDataChannel, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },

    onDeploy(channel: DeployChannel, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    onWithdraw(channel: WithdrawChannel, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    onContracttAddress(
      channel: ContractAddressChannel,
      func: (...args: unknown[]) => void,
    ) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    onCheckBalance(
      channel: CheckBalanceChannel,
      func: (...args: unknown[]) => void,
    ) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    onUpdateData(
      channel: UpdateDataChannel,
      func: (...args: unknown[]) => void,
    ) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },

    onceDeploy(channel: DeployChannel, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    onceWithdraw(channel: WithdrawChannel, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    onceContractAddress(
      channel: ContractAddressChannel,
      func: (...args: unknown[]) => void,
    ) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    onceCheckBalance(
      channel: CheckBalanceChannel,
      func: (...args: unknown[]) => void,
    ) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },

    onceUpdateData(
      channel: UpdateDataChannel,
      func: (...args: unknown[]) => void,
    ) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
