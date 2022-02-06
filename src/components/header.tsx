import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import React from 'react';
import Link from 'next/link'

const Header = (props: {connected: boolean}) => {
  return <div className="flex flex-col md:flex-row justify-end space-x-0 md:space-x-5 space-y-5 md:space-x-0">
    <div className="flex space-x-5 items-center">
      <div className="space-x-5 text-lg font-bold">
        <Link href="http://jackedmoose.com/">
          <a>Home</a>
        </Link>
      </div>
      <WalletMultiButton />
    </div>
  </div>;
}

export default Header;