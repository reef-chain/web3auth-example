import Identicon from '@polkadot/react-identicon';
import { ReefAccount, toReefAmount } from './util';

interface Account {
  account: ReefAccount
  onClick?: () => void;
}

const Account = ({ account, onClick }: Account): JSX.Element => (
  <div onClick={onClick} className="account">
    <div className="avatar">
      <Identicon value={account.address} size={44} theme="substrate" />
    </div>
    <div className="content">
      <div className="name">{ account.name }</div>
      <div><b>Native address:</b> { account.address }</div>
      <div><b>EVM address:</b> { account.evmAddress } ({ account.isEvmClaimed ? "✅ Claimed" : "❌ Not Claimed" })</div>
      <div><b>Balance:</b> { toReefAmount(account.balance) }</div>
    </div>
  </div>
);

export default Account;
