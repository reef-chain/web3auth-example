import { useEffect, useRef, useState } from 'react';
import Account from './Account';
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from "@web3auth/base";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import RPC from "./rpc";
import { CLIENT_ID, REEF_NETWORK, RPC_URL, WEB3_AUTH_NETWORK } from './config';

interface Status {
  inProgress: boolean;
  message?: string;
}

const App = (): JSX.Element => {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [web3authProvider, setWeb3authProvider] = useState<SafeEventEmitterProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    initWeb3Auth();
  }, []);

  // Initialize Web3Auth
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

  const authenticateUser = async () => {
    if (!web3auth) {
      alert("web3auth not initialized yet");
      return;
    }
    const idToken = await web3auth.authenticateUser();
    console.log(idToken);
  };

  const getUserInfo = async () => {
    if (!web3auth) {
      alert("web3auth not initialized yet");
      return;
    }
    const user = await web3auth.getUserInfo();
    console.log(user);
  };

  const logout = async () => {
    setWeb3authProvider(null);
    if (!web3auth) {
      alert("web3auth not initialized yet");
      return;
    }
    await web3auth.logout();
    setWeb3authProvider(null);
    setLoggedIn(false);
  };

  const getAccounts = async () => {
    if (!web3authProvider) {
      alert("provider not initialized yet");
      return;
    }
    const rpc = new RPC(web3authProvider);
    const address = await rpc.getAccounts();
    console.log(address);
  };

  const getBalance = async () => {
    if (!web3authProvider) {
      alert("provider not initialized yet");
      return;
    }
    const rpc = new RPC(web3authProvider);
    const balance = await rpc.getBalance();
    console.log(balance);
  };

  const signAndSendTransaction = async () => {
    if (!web3authProvider) {
      alert("provider not initialized yet");
      return;
    }
    const rpc = new RPC(web3authProvider);
    const receipt = await rpc.signAndSendTransaction();
    console.log(receipt);
  };

  const signMessage = async () => {
    if (!web3authProvider) {
      alert("provider not initialized yet");
      return;
    }
    const rpc = new RPC(web3authProvider);
    const signedMessage = await rpc.signMessage();
    console.log(signedMessage);
  };

  return (
    <div className="App">
      <h1>Reef Chain dApp</h1>
      { web3auth && !web3authProvider &&
        <button onClick={login}>Login</button>
      }
      { web3authProvider &&
        <>
          <button onClick={getUserInfo}>Get User Info</button> <br />
          <button onClick={authenticateUser}>Get ID Token</button> <br />
          <button onClick={getAccounts}>Get Accounts</button> <br />
          <button onClick={getBalance}>Get Balance</button> <br />
          <button onClick={signAndSendTransaction}>Sign and Send Transaction</button> <br />
          <button onClick={signMessage}>Sign Message</button> <br />
          <button onClick={logout}>Logout</button> <br />
        </>
      }
    </div>
  );
};

export default App;