import { useEffect, useState } from 'react';
import Account from './Account';
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from "@web3auth/base";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import RPC from "./rpc";
import { CLIENT_ID, REEF_NETWORK, RPC_URL, WEB3_AUTH_NETWORK } from './config';
import { ReefAccount } from './util';

const App = (): JSX.Element => {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [web3authProvider, setWeb3authProvider] = useState<SafeEventEmitterProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [reefAccount, setReefAccount] = useState<ReefAccount | null>(null);
  const [reefAccountLoading, setReefAccountLoading] = useState(false);

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
      
      // const openloginAdapter = new OpenloginAdapter({
      //   adapterSettings: {
      //     uxMode: "popup",
      //   },
      // });
      // web3auth.configureAdapter(openloginAdapter);
      
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

  const getReefAccount = async () => {
    setReefAccountLoading(true);
    const user = await web3auth!.getUserInfo();
    const rpc = new RPC(web3authProvider!);
    const reefAccount = await rpc.getReefAccount(user.name || '');
    setReefAccount(reefAccount);
    setReefAccountLoading(false);
  }

  const logout = async () => {
    if (!web3auth) {
      alert("web3auth not initialized yet");
      return;
    }
    await web3auth.logout();
    setWeb3authProvider(null);
    setLoggedIn(false);
    setReefAccount(null);
  };

  const authenticateUser = async () => {
    if (!web3auth) {
      alert("web3auth not initialized yet");
      return;
    }
    const idToken = await web3auth.authenticateUser();
    console.log(idToken);
    alert("ID Token: " + idToken.idToken);
  };

  const getUserInfo = async () => {
    if (!web3auth) {
      alert("web3auth not initialized yet");
      return;
    }
    const user = await web3auth.getUserInfo();
    console.log(user);
    alert("User Info: " + JSON.stringify(user));
  };

  const signAndSendTransaction = async () => {
    if (!web3authProvider) {
      alert("provider not initialized yet");
      return;
    }
    const rpc = new RPC(web3authProvider);
    const txHash = await rpc.signAndSendTransaction();
    alert("Transaction Hash: " + txHash);
  };

  const signMessage = async () => {
    if (!web3authProvider) {
      alert("provider not initialized yet");
      return;
    }
    const rpc = new RPC(web3authProvider);
    const signature = await rpc.signMessage();
    alert("Signature: " + signature);
  };

  const claimEvmAccount = async () => {
    if (!web3authProvider) {
      alert("provider not initialized yet");
      return;
    }
    const rpc = new RPC(web3authProvider);
    const txHash = await rpc.claimEvmAccount();
    alert("Transaction Hash: " + txHash);
  };

  return (
    <div className="App">
      <h1>Reef Chain dApp</h1>
      { web3auth && !loggedIn &&
        <button onClick={login}>Login</button>
      }
      { loggedIn &&
        <>
          { reefAccountLoading && !reefAccount && <div className='loading'>Loading account...</div> }
          { reefAccount && <Account account={reefAccount} /> }
          <button onClick={getUserInfo}>Get User Info</button>
          <button onClick={authenticateUser}>Get ID Token</button>
          <button onClick={signAndSendTransaction}>Sign and Send Transaction</button>
          <button onClick={signMessage}>Sign Message</button>
          { reefAccount && !reefAccount.isEvmClaimed &&
            <button onClick={claimEvmAccount}>Claim EVM account</button>
          }
          <button onClick={logout}>Logout</button>
        </>
      }
    </div>
  );
};

export default App;