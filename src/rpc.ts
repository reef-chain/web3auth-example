import type { SafeEventEmitterProvider } from "@web3auth/base";
import {
  TestAccountSigningKey,
  Provider,
  Signer,
} from "@reef-defi/evm-provider";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { WsProvider, Keyring } from "@polkadot/api";
import { stringToU8a, u8aToHex } from '@polkadot/util';
import { Provider as ReefEvmProvider } from "@reef-defi/evm-provider";
import { RPC_URL } from "./config";
import { getAddress } from "ethers";
import { ReefAccount, computeDefaultEvmAddress } from "./util";

export default class ReefRpc {
  private web3authProvider: SafeEventEmitterProvider;

  constructor(web3authProvider: SafeEventEmitterProvider) {
    this.web3authProvider = web3authProvider;
  }

  getProviderApi = async (): Promise<any> => {
    try {
      const provider = new ReefEvmProvider({provider: new WsProvider(RPC_URL)});
      await provider.api.isReady;
      return provider.api;
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

  getAddress = async (): Promise<any> => {
    const keyPair = await this.getKeyPair();
    return keyPair.address;
  }

  getSigner = async (): Promise<Signer> => {
    const keyPair = await this.getKeyPair();
    const api = await this.getProviderApi();
    const signingKey = new TestAccountSigningKey(api.registry);
    signingKey.addKeyringPair(keyPair);
    return new Signer(api.provider, keyPair.address, signingKey);
  }

  getBalance = async (): Promise<BigInt> => {
    const address = await this.getAddress();
    const api = await this.getProviderApi();
    const data = await api.query.system.account(address);
    return BigInt(data.data.free.toString(10));
  }

  queryEvmAddress = async (): Promise<{ evmAddress: string, isEvmClaimed: boolean }> => {
    const address = await this.getAddress();
    const api = await this.getProviderApi();
    const claimedAddress = await api.query.evmAccounts.evmAddresses(address);
    if (!claimedAddress.isEmpty) {
      const evmAddress = getAddress(claimedAddress.toString());
      return { evmAddress, isEvmClaimed: true };
    }
    return { evmAddress: computeDefaultEvmAddress(address), isEvmClaimed: false };
  }

  getReefAccount = async (name: string): Promise<ReefAccount> => {
    const address = await this.getAddress();
    const balance = await this.getBalance();
    const { evmAddress, isEvmClaimed } = await this.queryEvmAddress();
    const signer = await this.getSigner();
  
    return {
      name,
      balance,
      address,
      evmAddress,
      isEvmClaimed,
      signer,
    };
  };

  claimEvmAccount = async (): Promise<any> => {

  };

  signAndSendTransaction = async (): Promise<any> => {
    const keyPair = await this.getKeyPair();
    const api = await this.getProviderApi();
    const txHash = await api.tx.balances
      .transfer("5EnY9eFwEDcEJ62dJWrTXhTucJ4pzGym4WZ2xcDKiT3eJecP", 1000)
      .signAndSend(keyPair);
    return txHash.toHuman();
  };

  signMessage = async () => {
    const keyPair = await this.getKeyPair();
    const message = stringToU8a('Hello World');
    const signature = keyPair.sign(message);
    return u8aToHex(signature);
  }

}