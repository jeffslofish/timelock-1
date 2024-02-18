import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { useState, ChangeEvent, ReactNode, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
// import { TextField, makeStyles } from '@mui/material'; might need later
import {
  ColumnDef,
  RowSelectionState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  selectRowsFn,
  useReactTable,
} from '@tanstack/react-table';
import { Checkbox } from '@mui/material';

function Hello() {
  const [walletAddress, setWallettAddress] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const defaultReleaseTime = dayjs('2024-02-17T4:20:00');
  const [releaseTime, setReleaseTime] = useState<dayjs.Dayjs | null>(
    defaultReleaseTime,
  );

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  type Contract = {
    address: string;
    balance: number;
  };

  const [data, setData] = useState<Contract[]>([]);

  let apiKey = '';
  let apiURL = '';

  const [contracts, setContracts] = useState<Contract[]>([]);

  const columnHelper = createColumnHelper<Contract>();

  const columns = [
    {
      id: 'select-col',
      header: ({ table }: any) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()} //or getToggleAllPageRowsSelectedHandler
        />
      ),
      cell: ({ row }: any) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    },
    columnHelper.accessor('address', {
      cell: (info) => info.getValue(),
      header: () => <span>Address</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.balance, {
      id: 'balance',
      cell: (info) => <i>{info.getValue()}</i>,
      header: () => <span>Balance</span>,
      footer: (info) => info.column.id,
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection, //hoist up the row selection state to your own scope
    state: {
      rowSelection, //pass the row selection state back to the table instance
    },
  });

  useEffect(() => {
    window.electron.ipcRenderer.onceContractAddress(
      'contractAddress',
      (arg: any) => {
        // eslint-disable-next-line no-console
        console.log(arg);
        setData(arg);
      },
    );
    window.electron.ipcRenderer.sendContractAddressMessage(
      'contractAddress',
      [],
    );
  }, []);

  const deploy = () => {
    // calling IPC exposed from preload script
    window.electron.ipcRenderer.onceDeploy('deploy', (arg: any) => {
      const [success, msg] = arg;

      if (success) {
        // eslint-disable-next-line no-console
        console.log(msg);
        toast.success('Deploy Successful!');
        setContractAddress(String(msg));

        setData([...data, { address: msg, balance: 0 }]);
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
        toast.success('Withdraw Successful!');
        setWithdrawMessage(String(msg));
      } else {
        toast.error('Error: ' + msg);
      }
    });

    const selectedRows = table.getSelectedRowModel().rows;

    let addresses = [];
    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      addresses.push(row.original.address);
    }

    window.electron.ipcRenderer.sendWithdrawMessage('withdraw', [addresses]);
  };

  const checkBalance = async () => {
    // calling IPC exposed from preload script
    window.electron.ipcRenderer.onceCheckBalance('checkBalance', (arg: any) => {
      // const [success, contractAddress, balance] = arg;
      const [success, contracts] = arg;

      console.log('checkbalance for ' + contracts);
      if (success) {
        // eslint-disable-next-line no-console
        console.log(arg);
        toast.success('Balance Check Successful!');

        // let updatedList = data.map((contracts) => {
        //   if (contracts.address == contractAddress) {
        //     return { ...item, balance: balance };
        //   }
        //   return item;
        // });

        setData(contracts);
      } else {
        toast.error('Error: ' + arg);
      }
    });

    const selectedRows = table.getSelectedRowModel().rows;

    let addresses = [];
    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      addresses.push(row.original.address);
    }
    //selectedRows.forEach(async (row) => {
    // if (row.original.address) {
    //   const DEF_DELAY = 1000;

    //   function sleep(ms: any) {
    //     return new Promise((resolve) => setTimeout(resolve, ms || DEF_DELAY));
    //   }

    //   await sleep(2000);
    console.log('sending check balance for  addr: ' + addresses);
    window.electron.ipcRenderer.sendCheckBalanceMessage(
      'checkBalance',
      addresses,
    );
    // } else {
    //   toast.error('No contract address found to check balance.');
    // }
    // }
  };

  const changeWalletAddress = ({ target }: ChangeEvent<HTMLInputElement>) => {
    setWallettAddress(target.value);
  };

  const clearRow = async () => {
    const selectedRows = table.getSelectedRowModel().rows;

    const newData = data.filter(
      (obj) =>
        !selectedRows.some((obj2) => obj.address === obj2.original.address),
    );

    setData(newData);
    console.log('sending updatedata message for data: ' + newData);
    window.electron.ipcRenderer.sendUpdateDataMessage('updateData', newData);
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

      <div className="date-time-picker" style={{ paddingTop: '20px' }}>
        <DateTimePicker
          label="Choose Unlock Date:Time"
          value={releaseTime}
          onChange={(newValue) => setReleaseTime(newValue)}
        />
      </div>
      <br />
      <button
        type="button"
        id="deployButton"
        className="button"
        onClick={deploy}
      >
        Deploy Contract
      </button>

      <br />
      <button
        type="button"
        id="withdrawButton"
        className="button"
        onClick={withdraw}
      >
        Withdraw Funds
      </button>

      <br />
      <button
        type="button"
        id="checkBalance"
        className="button"
        onClick={checkBalance}
      >
        Check balance
      </button>

      <br />
      <button type="button" id="clearRow" className="button" onClick={clearRow}>
        Erase Row
      </button>

      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
