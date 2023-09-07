import { useEffect, useRef, useState } from 'react';
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from "@web3auth/base";
import { ethers } from 'ethers';
import Account from './Account';
import RPC from "./rpc";
import { CLIENT_ID, REEF_NETWORK, RPC_URL, WEB3_AUTH_NETWORK } from './config';
import { ReefAccount, captureError } from './util';

const App = (): JSX.Element => {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [web3authProvider, setWeb3authProvider] = useState<SafeEventEmitterProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [reefAccount, setReefAccount] = useState<ReefAccount | null>(null);
  const [reefAccountLoading, setReefAccountLoading] = useState(false);
  const reefAccountRef = useRef(reefAccount);

  useEffect(() => {
    initWeb3Auth();
  }, []);

  useEffect(() => {
    if (web3auth && web3authProvider && loggedIn && !reefAccount) {
      getReefAccount();
    }
  }, [web3auth, web3authProvider, loggedIn]);

  const initWeb3Auth = async () => {
    try {
      const web3auth = new Web3Auth({
        clientId: CLIENT_ID,
        web3AuthNetwork: WEB3_AUTH_NETWORK,
        chainConfig: {
          chainId: "0x3673",
          rpcTarget: RPC_URL,
          chainNamespace: CHAIN_NAMESPACES.OTHER,
          displayName: REEF_NETWORK,
          ticker: "REEF",
          tickerName: "Reef",
        }
      });
      
      await web3auth.initModal();
      setWeb3auth(web3auth);
      setWeb3authProvider(web3auth.provider);

      if (web3auth.connected) {
        setLoggedIn(true);
      };
    } catch (err: any) {
      console.error(err);
    }
  }

  const login = async () => {
    if (!web3auth) {
      alert("web3auth not initialized yet");
      return;
    }
    const web3authProvider = await web3auth.connect();
    setWeb3authProvider(web3authProvider);
    setLoggedIn(true);
  };

  const logout = async () => {
    if (!web3auth) {
      alert("web3auth not initialized yet");
      return;
    }
    await web3auth.logout();
    setWeb3authProvider(null);
    setLoggedIn(false);
    setReefAccount(null);
    reefAccountRef.current = null;
    unsubBalance();
  };

  const authenticateUser = async () => {
    const idToken = await web3auth!.authenticateUser();
    console.log(idToken);
    alert("ID Token: " + idToken.idToken);
  };

  const getUserInfo = async () => {
    const user = await web3auth!.getUserInfo();
    console.log(user);
    alert("User Info: " + JSON.stringify(user));
  };

  const nativeTransfer = async () => {
    const rpc = new RPC(web3authProvider!);
    const txHash = await rpc.nativeTransfer(
      "5EnY9eFwEDcEJ62dJWrTXhTucJ4pzGym4WZ2xcDKiT3eJecP", 
      1000
    );
    alert("Transaction Hash: " + txHash);
  };

  const signRaw = async () => {
    const rpc = new RPC(web3authProvider!);
    const signature = await rpc.signRaw("Hello World");
    alert("Signature: " + signature);
  };

  const getReefAccount = async () => {
    setReefAccountLoading(true);
    const user = await web3auth!.getUserInfo();
    const rpc = new RPC(web3authProvider!);
    const reefAccount = await rpc.getReefAccount(user.name || '');
    setReefAccount(reefAccount);
    setReefAccountLoading(false);
    reefAccountRef.current = reefAccount;
    subscribeBalance();
  }

  const claimDefaultEvmAccount = async () => {
    if (reefAccount!.balance < ethers.utils.parseEther("5").toBigInt()) {
      alert("Not enough balance for claiming EVM account. Transfer at least 5 REEF to your account first.");
      return;
    }
    const rpc = new RPC(web3authProvider!);
    rpc.claimDefaultEvmAccount(handleClaimEvmAccountStatus);
  };

  const claimEvmAccount = async () => {
    if (reefAccount!.balance < ethers.utils.parseEther("5").toBigInt()) {
      alert("Not enough balance for claiming EVM account. Transfer at least 5 REEF to your account first.");
      return;
    }

    // Set evm address and evm signature provided by the user
    const evmAddress = "";
    const signature = "";

    const rpc = new RPC(web3authProvider!);
    rpc.claimEvmAccount(evmAddress, signature, handleClaimEvmAccountStatus);
  };

  const handleClaimEvmAccountStatus = (status: any) => {
    console.log("status =", status)
    const err = captureError(status.events);
    if (err) {
      console.log("binding error", err);
      alert("Error while claiming EVM account");
    }
    if (status.dispatchError) {
      console.log("binding dispatch error", status.dispatchError.toString());
      alert("Error while claiming EVM account");
    }
    if (status.status.isInBlock) {
      console.log("Included at block hash", status.status.asInBlock.toHex());
      const rpc = new RPC(web3authProvider!);
      rpc.queryEvmAddress()
        .then(({ evmAddress, isEvmClaimed }) => {
          reefAccountRef.current = {
            ...reefAccountRef.current!,
            evmAddress,
            isEvmClaimed,
          };
          setReefAccount({
            ...reefAccountRef.current!,
            evmAddress,
            isEvmClaimed,
          });
        }).catch((err) => {
          console.log("queryEvmAddress error", err);
          alert("Error while claiming EVM account");
        });
    }
    if (status.status.isFinalized) {
      console.log("Finalized block hash", status.status.asFinalized.toHex());
    }
  };

  let unsubBalance = () => {};

  const subscribeBalance = async (): Promise<void> => {
    const rpc = new RPC(web3authProvider!);
    unsubBalance = await rpc.subscribeToBalance(async (balFree: bigint, address: string) => {
      if (reefAccountRef.current?.address === address) {
        reefAccountRef.current = {
          ...reefAccountRef.current,
          balance: balFree,
        };
        setReefAccount({
          ...reefAccountRef.current,
          balance: balFree,
        });
      }
    });
  }

  const evmTransaction = async () => {
    const rpc = new RPC(web3authProvider!);
    try {
      const res = await rpc.evmTransaction();
      console.log(res);
      alert("Transaction Hash: " + res.hash);
    } catch (err) {
      console.log(err);
      alert(`Error: ${err}`);
    }
  };

  return (
    <div className="App">
      <h1>Reef Web3Auth dApp</h1>
      { web3auth && !loggedIn &&
        <button onClick={login}>Login</button>
      }
      { loggedIn &&
        <>
          { reefAccountLoading && !reefAccount && <div className='loading'>Loading account...</div> }
          { reefAccount && <Account account={reefAccount} /> }
          <button onClick={getUserInfo}>Get User Info</button>
          <button onClick={authenticateUser}>Get ID Token</button>
          <button onClick={nativeTransfer}>Native transfer</button>
          <button onClick={signRaw}>Sign message</button>
          { reefAccount && !reefAccount.isEvmClaimed &&
            <>
              <button onClick={claimDefaultEvmAccount}>Claim default EVM account</button>
              {/* <button onClick={claimEvmAccount}>Claim owned EVM account</button> */}
            </>
          }
          { reefAccount?.isEvmClaimed &&
            <>
              <button onClick={evmTransaction}>EVM transaction</button>
            </>
          }
          <button onClick={logout}>Logout</button>
        </>
      }
    </div>
  );
};

export default App;