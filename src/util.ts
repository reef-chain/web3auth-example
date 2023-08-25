import { blake2AsU8a, decodeAddress } from '@polkadot/util-crypto';
import { u8aConcat, u8aEq, u8aToHex } from '@polkadot/util';
import { formatEther, getAddress } from "ethers";
import { FrameSystemEventRecord as Event } from '@polkadot/types/lookup';
import { Provider, Signer } from "@reef-defi/evm-provider";

export interface ReefAccount {
  name: string;
  balance: BigInt;
  address: string;
  evmAddress: string;
  isEvmClaimed: boolean;
  signer?: Signer;
}

const computeDefaultEvmAddress = (address: string): string => {
  const publicKey = decodeAddress(address);

  const isStartWithEvm = u8aEq('evm:', publicKey.slice(0, 4));

  if (isStartWithEvm) {
    return getAddress(u8aToHex(publicKey.slice(4, 24)));
  }

  return getAddress(
    u8aToHex(blake2AsU8a(u8aConcat('evm:', publicKey), 256).slice(0, 20))
  );
}

export const queryEvmAddress = async (address: string, provider: Provider): Promise<{ evmAddress: string, isEvmClaimed: boolean }> => {
  const claimedAddress = await provider.api.query.evmAccounts.evmAddresses(address);
  if (!claimedAddress.isEmpty) {
    const evmAddress = getAddress(claimedAddress.toString());
    return { evmAddress, isEvmClaimed: true };
  }

  return { evmAddress: computeDefaultEvmAddress(address), isEvmClaimed: false };
}

export const toAddressShortDisplay = (address: string, size = 19): string => {
  return address.length < size
    ? address
    : `${address.slice(0, size - 5)}...${address.slice(address.length - 5)}`;
}

const hexToAscii = (str1: string): string => {
  const hex = str1.toString();
  let str = '';
  for (let n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
}

export const captureError = (events: Event[]): string|undefined => {
  // for (const event of events) {
  //   const eventCompression = `${event.event.section.toString()}.${event.event.method.toString()}`;
  //   if (eventCompression === 'evm.ExecutedFailed') {
  //     const eventData = (event.event.data.toJSON() as any[]);
  //     let message = eventData[eventData.length - 2];
  //     if (typeof message === 'string' || message instanceof String) {
  //       message = hexToAscii(message.substring(138));
  //     } else {
  //       message = JSON.stringify(message);
  //     }
  //     return message
  //   }
  // }
  return undefined;
}

export const subscribeToBalance = async (signer: Signer, cb: (freeBalance: any)=>void): Promise<any> => {
  let address = await signer.getSubstrateAddress();
  const unsub = await signer.provider.api.query.system.account(address, ({ data: balance }) => {
      cb(BigInt(balance.free.toString()));
  });
  return unsub;
}

export const toReefAmount = (amount: BigInt, decimals = 2): string => {
  const reefUnits = formatEther(amount.toString());
  return parseFloat(reefUnits).toFixed(decimals);
}