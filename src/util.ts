import { blake2AsU8a, decodeAddress } from '@polkadot/util-crypto';
import { u8aConcat, u8aEq, u8aToHex } from '@polkadot/util';
import { FrameSystemEventRecord as Event } from '@polkadot/types/lookup';
import { ethers } from "ethers";

export interface ReefAccount {
  name: string;
  balance: bigint;
  address: string;
  evmAddress: string;
  isEvmClaimed: boolean;
}

export const computeDefaultEvmAddress = (address: string): string => {
  const publicKey = decodeAddress(address);

  const isStartWithEvm = u8aEq('evm:', publicKey.slice(0, 4));

  if (isStartWithEvm) {
    return ethers.utils.getAddress(u8aToHex(publicKey.slice(4, 24)));
  }

  return ethers.utils.getAddress(
    u8aToHex(blake2AsU8a(u8aConcat('evm:', publicKey), 256).slice(0, 20))
  );
}

export const toAddressShortDisplay = (address: string, size = 19): string => {
  return address.length < size
    ? address
    : `${address.slice(0, size - 5)}...${address.slice(address.length - 5)}`;
}

export const captureError = (events: Event[]): string|undefined => {
  for (const event of events) {
    const eventCompression = `${event.event.section.toString()}.${event.event.method.toString()}`;
    if (eventCompression === 'evm.ExecutedFailed') {
      const eventData = (event.event.data.toJSON() as any[]);
      let message = eventData[eventData.length - 2];
      if (typeof message === 'string' || message instanceof String) {
        message = hexToAscii(message.substring(138));
      } else {
        message = JSON.stringify(message);
      }
      return message
    }
  }
  return undefined;
}

export const toReefAmount = (amount: BigInt, decimals = 2): string => {
  const reefUnits = ethers.utils.formatEther(amount.toString());
  return parseFloat(reefUnits).toFixed(decimals);
}

const hexToAscii = (str1: string): string => {
  const hex = str1.toString();
  let str = '';
  for (let n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
}