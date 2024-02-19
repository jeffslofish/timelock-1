import withdrawLogo from '../../assets/icons/withdraw.png';
import checkBalanceLogo from '../../assets/icons/check-balance.png';
import deployLogo from '../../assets/icons/deploy.png';
import deleteRowsLogo from '../../assets/icons/delete-rows.png';

import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { useState, ChangeEvent, ReactNode, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';

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
  const WEI = 1000000000000000000;
  const [walletAddress, setWallettAddress] = useState('');
  const [walletName, setWalletName] = useState('');
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [contractReleaseTime, setContractReleaseTime] =
    useState<dayjs.Dayjs | null>(dayjs(Date.now()));
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [currentPrice, setCurrentPrice] = useState(0);

  const [visible, setVisible] = useState(false);
  const toastDialog = useRef(null);

  type Contract = {
    walletName: string;
    address: string;
    releaseTime: number;
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
    columnHelper.accessor((row) => row.walletName, {
      id: 'walletName',
      cell: (info) => info.getValue(),
      header: () => <span>Wallet Name</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor('address', {
      cell: (info) => (
        <button
          className="btn"
          onClick={() => navigator.clipboard.writeText(info.getValue())}
        >
          <svg
            width="180px"
            height="60px"
            viewBox="0 0 180 60"
            className="border"
          >
            <polyline
              points="179,1 179,59 1,59 1,1 179,1"
              className="bg-line"
            />
            <polyline
              points="179,1 179,59 1,59 1,1 179,1"
              className="hl-line"
            />
          </svg>
          <span>
            {info.getValue().slice(0, 5)}...
            {info
              .getValue()
              .slice(info.getValue().length - 5, info.getValue().length)}
          </span>
        </button>
      ),
      header: () => <span>Contract Address</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.releaseTime, {
      id: 'releaseTime',
      cell: (info) => <i>{dayjs.unix(info.getValue()).format('LLLL')}</i>,
      header: () => <span>Release Time</span>,
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor((row) => row.balance, {
      id: 'balance',
      cell: (info) => (
        <i>
          {info.getValue() / WEI} ($
          {((info.getValue() / WEI) * currentPrice).toFixed(2)})
        </i>
      ),
      header: () => <span>Contract Balance</span>,
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
      const [success, walletName, address, releaseTime] = arg;

      if (success) {
        // eslint-disable-next-line no-console
        console.log(arg);
        toast.success('Deploy Successful!');

        setData([
          ...data,
          {
            walletName: walletName,
            address: address,
            releaseTime: releaseTime,
            balance: 0,
          },
        ]);
      } else {
        toast.error('Error: ' + arg);
      }
    });

    if (contractReleaseTime) {
      window.electron.ipcRenderer.sendDeployMessage('deploy', [
        walletName,
        walletAddress,
        contractReleaseTime.unix(),
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
      const [success, contracts, price] = arg;

      if (success) {
        console.log('checkbalance for ' + contracts);
        // eslint-disable-next-line no-console

        toast.success('Balance Check Successful!');

        // let updatedList = data.map((contracts) => {
        //   if (contracts.address == contractAddress) {
        //     return { ...item, balance: balance };
        //   }
        //   return item;
        // });
        setCurrentPrice(Number(price));
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

    console.log('sending check balance for  addr: ' + addresses);
    window.electron.ipcRenderer.sendCheckBalanceMessage(
      'checkBalance',
      addresses,
    );
  };

  const changeWalletAddress = ({ target }: ChangeEvent<HTMLInputElement>) => {
    setWallettAddress(target.value);
  };

  const changeWalletName = ({ target }: ChangeEvent<HTMLInputElement>) => {
    setWalletName(target.value);
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

  const accept = () => {
    if (toastDialog && toastDialog.current) {
      clearRow();
      toastDialog.current.show({
        severity: 'info',
        detail: 'Contracts have been deleted!',
        life: 3000,
      });
    }
  };

  const reject = () => {
    if (toastDialog && toastDialog.current) {
      toastDialog.current.show({
        severity: 'warn',
        detail: 'Contract(s) deletion cancelled!',
        life: 3000,
      });
    }
  };
  return (
    <div>
      <div className="deployArea">
        <div className="walletAddressArea">
          <label htmlFor="walletAddressInput">Wallet Name:</label>
          <input
            type="text"
            id="walletNameInput"
            value={walletName}
            onChange={changeWalletName}
          />
          <br />

          <label htmlFor="walletAddressInput">Wallet Address:</label>
          <input
            type="text"
            id="walletAddressInput"
            value={walletAddress}
            onChange={changeWalletAddress}
          />
        </div>

        <div className="date-time-picker" style={{ paddingTop: '20px' }}>
          <DateTimePicker
            label="Choose Unlock Date:Time"
            value={contractReleaseTime}
            onChange={(newValue) => setContractReleaseTime(dayjs(newValue))}
            showDaysOutsideCurrentMonth
          />
        </div>
        <button
          type="button"
          id="deployButton"
          className="button"
          title="Deploy"
          onClick={deploy}
        >
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <img src={deployLogo} alt="deploy" className="button-icon" />
          {/* Deploy Contract */}
        </button>
      </div>

      <div className="tableInteractionArea">
        <div className="buttonArea">
          <button
            type="button"
            id="withdrawButton"
            className="button"
            title="Withdraw"
            onClick={withdraw}
          >
            <img src={withdrawLogo} alt="withdraw" className="button-icon" />
            {/* Withdraw Funds */}
          </button>
          <button
            type="button"
            id="checkBalance"
            className="button"
            title="Check Balance"
            onClick={checkBalance}
          >
            <img
              src={checkBalanceLogo}
              alt="check balance"
              className="button-icon"
            />
            {/* Check balance */}
          </button>
          <Toast ref={toastDialog} className="confirmDialog" />
          <ConfirmDialog
            group="declarative"
            visible={visible}
            onHide={() => setVisible(false)}
            message="Are you sure you want to proceed?"
            header="Confirmation"
            icon="pi pi-exclamation-triangle"
            accept={accept}
            reject={reject}
          />
          <Button
            id="clearRow"
            className="button"
            title="Clear Row(s)"
            onClick={() => setVisible(true)}
          >
            <img
              src={deleteRowsLogo}
              alt="delete rows"
              className="button-icon"
            />
          </Button>
        </div>
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
