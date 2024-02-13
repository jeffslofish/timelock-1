import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';
import { useState, ChangeEvent } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function Hello() {
  const [walletAddress, setWallettAddress] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [withdrawMessage, setWithdrawMessage] = useState('');

  let apiKey = '';
  let apiURL = '';

  if (contractAddress == '') {
    window.electron.ipcRenderer.onceContractAddress(
      'contractAddress',
      (arg) => {
        // eslint-disable-next-line no-console
        console.log(arg);
        setContractAddress(String(arg));
      },
    );
    window.electron.ipcRenderer.sendContractAddressMessage(
      'contractAddress',
      [],
    );
  }

  const deploy = () => {
    // calling IPC exposed from preload script
    window.electron.ipcRenderer.onceDeploy('deploy', (arg: any) => {
      const [success, msg] = arg;

      if (success) {
        // eslint-disable-next-line no-console
        console.log(msg);
        toast.success('Success!');
        setContractAddress(String(msg));
      } else {
        toast.error('Error: ' + msg);
      }
    });
    window.electron.ipcRenderer.sendDeployMessage('deploy', [walletAddress]);
  };

  const withdraw = () => {
    window.electron.ipcRenderer.onceWithdraw('withdraw', (arg: any) => {
      const [success, msg] = arg;

      // eslint-disable-next-line no-console
      console.log(msg);

      if (success) {
        toast.success('Success!');
        setWithdrawMessage(String(msg));
      } else {
        toast.error('Error: ' + msg);
      }
    });

    window.electron.ipcRenderer.sendWithdrawMessage('withdraw', [
      contractAddress,
    ]);
  };

  const changeWalletAddress = ({ target }: ChangeEvent<HTMLInputElement>) => {
    setWallettAddress(target.value);
  };

  return (
    <div>
      <label htmlFor="walletAddressInput">Wallet Address:</label>
      <input
        type="text"
        id="wallettAddressInput"
        value={walletAddress}
        onChange={changeWalletAddress}
      />

      <br />
      <button id="deployButton" onClick={deploy}>
        Deploy Contract
      </button>
      <div>
        <p>Contract Address:</p>
        <p>{contractAddress}</p>
      </div>

      <button id="withdrawButton" onClick={withdraw}>
        Withdraw Funds
      </button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<Hello />} />
        </Routes>
      </Router>
      <ToastContainer />
    </div>
  );
}
