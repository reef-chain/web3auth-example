import type { SafeEventEmitterProvider } from "@web3auth/base";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { WsProvider, Keyring, ApiPromise } from "@polkadot/api";
import { Provider as ReefEvmProvider } from "@reef-defi/evm-provider";
import { RPC_URL } from "./config";
import { options } from '@reef-defi/api';

export default class ReefRpc {
  private web3authProvider: SafeEventEmitterProvider;

  constructor(web3authProvider: SafeEventEmitterProvider) {
    this.web3authProvider = web3authProvider;
  }

  getProviderApi = async (): Promise<any> => {
    try {
      const wsProvider = new WsProvider(RPC_URL);

      const provider = new ReefEvmProvider({provider: wsProvider});
      await provider.api.isReady;
      return provider.api;

      const opt = options({ provider: wsProvider });
      console.log(opt);
      const api = new ApiPromise(options({ provider: wsProvider }));
      await api.isReadyOrError;
      return api;
    } catch (e) {
      console.log("Provider API error:", e);
      return null;
    }
  };

  getKeyPair = async (): Promise<any> => {
    await cryptoWaitReady();
    const privateKey = (await this.web3authProvider.request({
      method: "private_key",
    })) as string;
    const keyring = new Keyring({ ss58Format: 42, type: "sr25519" });
    const keyPair = keyring.addFromUri("0x" + privateKey);
    return keyPair;
  };

  getAccounts = async (): Promise<any> => {
    const keyPair = await this.getKeyPair();
    return keyPair.address;
  }

  getBalance = async (): Promise<string> => {
    const keyPair = await this.getKeyPair();
    const api = await this.getProviderApi();
    const data = await api.query.system.account(keyPair.address);
    console.log(data.toHuman());
    return data.data.free.toString();
  }

  signAndSendTransaction = async (): Promise<any> => {
    const keyPair = await this.getKeyPair();
    const api = await this.getProviderApi();
    // const txHash = await api.tx.balances
    //   .transfer("5Gzhnn1MsDUjMi7S4cN41CfggEVzSyM58LkTYPFJY3wt7o3d", 12345)
    //   .signAndSend(keyPair);
    // console.log(txHash);
    // return txHash.toHuman();
  };

  signMessage = async () => {

  }

}