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
import {
  ColumnDef,
  RowSelectionState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Checkbox } from '@mui/material';

function Hello() {
  const [walletAddress, setWallettAddress] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [releaseTime, setReleaseTime] = useState<Dayjs | null>(null);
  const [balance, setBalance] = useState(0);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  type Contract = {
    address: string;
    balance: number;
  };

  const [data, setData] = useState<Contract[]>([]);

  let apiKey = '';
  let apiURL = '';

  // const tempData = [
  //   {
  //     checked: false,
  //     address: '0x205872059255',
  //     balance: 5,
  //   },
  //   {
  //     checked: true,
  //     address: '0x384738742059255',
  //     balance: 10,
  //   },
  //   {
  //     checked: false,
  //     address: '0x49584985458',
  //     balance: 15,
  //   },
  // ];

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

  if (data && !data.length) {
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

    window.electron.ipcRenderer.sendWithdrawMessage('withdraw', [
      contractAddress,
    ]);
  };

  const checkBalance = () => {
    // calling IPC exposed from preload script
    window.electron.ipcRenderer.onceCheckBalance('checkBalance', (arg: any) => {
      const [success, contractAddress, balance] = arg;

      if (success) {
        // eslint-disable-next-line no-console
        console.log(arg);
        toast.success('Balance Check Successful!');
        //setBalance(msg);

        const i = data.findIndex((x) => x.address === contractAddress);
        const newData = data;
        newData[i] = { address: contractAddress, balance: balance };
        setData(newData);
      } else {
        toast.error('Error: ' + arg);
      }
    });

    const selectedRows = table.getSelectedRowModel().rows;

    selectedRows.forEach((row) => {
      if (row.original.address) {
        window.electron.ipcRenderer.sendCheckBalanceMessage('checkBalance', [
          row.original.address,
        ]);
      } else {
        toast.error('No contract address found to check balance.');
      }
    });
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
      <button type="button" id="deployButton" onClick={deploy}>
        Deploy Contract
      </button>
      <div>
        <p>Contract Address:</p>
        <p>{contractAddress}</p>
      </div>

      <button type="button" id="withdrawButton" onClick={withdraw}>
        Withdraw Funds
      </button>

      <br />
      <button type="button" id="checkBalance" onClick={checkBalance}>
        Check balance
      </button>

      <p>Balance: {balance}</p>

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
