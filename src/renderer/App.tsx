import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';
import { useState, ChangeEvent, ReactNode } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';

function Hello() {
  const [walletAddress, setWallettAddress] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [releaseTime, setReleaseTime] = useState<Dayjs | null>(null);

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

    if (releaseTime) {
      window.electron.ipcRenderer.sendDeployMessage('deploy', [
        walletAddress,
        releaseTime.unix(),
      ]);
    } else {
      toast.error('Please choose a release time');
    }
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

      <div className="date-time-picker">
        <DateTimePicker
          label="Controlled picker"
          value={releaseTime}
          onChange={(newValue) => setReleaseTime(newValue)}
        />
      </div>
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

interface Props {
  children?: ReactNode;
  // any props that come into the component
}

export default function App({ children }: Props) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {children}
      <div>
        <Router>
          <Routes>
            <Route path="/" element={<Hello />} />
          </Routes>
        </Router>
        <ToastContainer />
      </div>
    </LocalizationProvider>
  );
}
