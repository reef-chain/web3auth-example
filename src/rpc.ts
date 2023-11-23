import type { SafeEventEmitterProvider } from "@web3auth/base";
import {
  TestAccountSigningKey,
  Signer,
  Provider as ReefEvmProvider,
} from "@reef-chain/evm-provider";
import {
  buildPayload,
  sendSignedTransaction,
} from "@reef-chain/evm-provider/utils";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { KeyringPair } from "@polkadot/keyring/types";
import { WsProvider, Keyring } from "@polkadot/api";
import { stringToU8a, u8aToHex } from "@polkadot/util";
import { TypeRegistry } from "@polkadot/types";
import type { SignerPayloadJSON } from "@polkadot/types/types";
import { Contract, ethers, PopulatedTransaction } from "ethers";
import { RPC_URL } from "./config";
import { ReefAccount, computeDefaultEvmAddress } from "./util";
import { FlipperAbi } from "./flipperAbi";

export default class ReefRpc {
  private web3authProvider: SafeEventEmitterProvider;

  constructor(web3authProvider: SafeEventEmitterProvider) {
    this.web3authProvider = web3authProvider;
  }

  getProvider = async (): Promise<ReefEvmProvider> => {
    try {
      const provider = new ReefEvmProvider({
        provider: new WsProvider(RPC_URL),
      });
      await provider.api.isReady;
      return provider;
    } catch (e) {
      console.log("Provider API error:", e);
      throw e;
    }
  };

  getKeyPair = async (): Promise<KeyringPair> => {
    await cryptoWaitReady();
    const privateKey = (await this.web3authProvider.request({
      method: "private_key",
    })) as string;
    const keyring = new Keyring({ ss58Format: 42, type: "sr25519" });
    const keyPair = keyring.addFromUri("0x" + privateKey);
    return keyPair;
  };

  getNativeAddress = async (): Promise<string> => {
    const keyPair = await this.getKeyPair();
    return keyPair.address;
  };

  getSigner = async (): Promise<Signer> => {
    const keyPair = await this.getKeyPair();
    const provider = await this.getProvider();

    const signingKey = new TestAccountSigningKey(provider.api.registry);
    signingKey.addKeyringPair(keyPair);
    return new Signer(provider, keyPair.address, signingKey);
  };

  getBalance = async (): Promise<bigint> => {
    const address = await this.getNativeAddress();
    const provider = await this.getProvider();

    const data = await provider.api.query.system.account(address);
    return BigInt(data.data.free.toString(10));
  };

  queryEvmAddress = async (): Promise<{
    evmAddress: string;
    isEvmClaimed: boolean;
  }> => {
    const address = await this.getNativeAddress();
    const provider = await this.getProvider();

    const claimedAddress = await provider.api.query.evmAccounts.evmAddresses(
      address
    );
    if (!claimedAddress.isEmpty) {
      const evmAddress = ethers.utils.getAddress(claimedAddress.toString());
      return { evmAddress, isEvmClaimed: true };
    }
    return {
      evmAddress: computeDefaultEvmAddress(address),
      isEvmClaimed: false,
    };
  };

  getReefAccount = async (name: string): Promise<ReefAccount> => {
    const balance = await this.getBalance();
    const address = await this.getNativeAddress();
    const { evmAddress, isEvmClaimed } = await this.queryEvmAddress();

    return {
      name,
      balance,
      address,
      evmAddress,
      isEvmClaimed,
    };
  };

  claimDefaultEvmAccount = async (cb: (status: any) => void): Promise<any> => {
    const keyPair = await this.getKeyPair();
    const provider = await this.getProvider();

    await provider.api.tx.evmAccounts
      .claimDefaultAccount()
      .signAndSend(keyPair, (status: any) => {
        cb(status);
      });
  };

  claimEvmAccount = async (
    evmAddress: string,
    signature: string,
    cb: (status: any) => void
  ): Promise<any> => {
    const keyPair = await this.getKeyPair();
    const provider = await this.getProvider();

    await provider.api.tx.evmAccounts
      .claimAccount(evmAddress, signature)
      .signAndSend(keyPair, (status: any) => {
        cb(status);
      });
  };

  nativeTransfer = async (recipient: string, amount: number): Promise<any> => {
    const keyPair = await this.getKeyPair();
    const provider = await this.getProvider();

    const txHash = await provider.api.tx.balances
      .transfer(recipient, amount)
      .signAndSend(keyPair);
    return txHash.toHuman();
  };

  signRaw = async (messageStr: string) => {
    const keyPair = await this.getKeyPair();
    const message = stringToU8a(messageStr);

    const signature = keyPair.sign(message);
    return u8aToHex(signature);
  };

  signPayload = async (payload: SignerPayloadJSON): Promise<string> => {
    const keyPair = await this.getKeyPair();
    const registry = new TypeRegistry();
    registry.setSignedExtensions(payload.signedExtensions);

    return registry
      .createType("ExtrinsicPayload", payload, { version: payload.version })
      .sign(keyPair).signature;
  };

  evmTransaction = async (): Promise<any> => {
    const flipperContractAddress = "0x3bb302b1f0dCaFFB87017A7E7816cdB8C5ec710D";
    const provider = await this.getProvider();
    const signerAddress = await this.getNativeAddress();

    const contract = new Contract(
      flipperContractAddress,
      FlipperAbi,
      provider as any
    );

    const tx: PopulatedTransaction = await contract.populateTransaction.flip();

    const { payload, extrinsic } = await buildPayload(
      provider,
      signerAddress,
      tx
    );
    const signature = await this.signPayload(payload);
    extrinsic.addSignature(signerAddress, signature, payload);

    const txResult = await sendSignedTransaction(
      provider,
      signerAddress,
      tx,
      payload,
      extrinsic,
      signature
    );

    return txResult;
  };

  subscribeToBalance = async (
    cb: (freeBalance: bigint, address: string) => void
  ): Promise<any> => {
    const address = await this.getNativeAddress();
    const provider = await this.getProvider();

    const unsub = await provider.api.query.system.account(
      address,
      ({ data: balance }) => {
        cb(BigInt(balance.free.toString()), address);
      }
    );
    return unsub;
  };
}
