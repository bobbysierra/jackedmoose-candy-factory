/* eslint-disable @next/next/no-img-element */
import Head from 'next/head'

import { useState } from "react";
import { Toaster } from 'react-hot-toast';
import { useWallet } from "@solana/wallet-adapter-react";
import useCandyMachine from '../hooks/use-candy-machine';
import Header from '../components/header';
import useWalletBalance from '../hooks/use-wallet-balance';
import { shortenAddress } from '../utils/candy-machine';
import Countdown from 'react-countdown';
import {
  Button,
  CircularProgress,
  TextField,
  MenuItem,
  FormControl
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import styled from "styled-components";

const useStyles = makeStyles({
  selectRoot: {
    width: 85,
    textAlign: 'center',
    "& .MuiOutlinedInput-input": {
      color: "#d5d5d5",
      padding: '12.5px 28px 12.5px 14px'
    },
    "& .MuiInputLabel-root": {
      color: "#d5d5d5"
    },
    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
      borderColor: "#d5d5d5"
    },
    "&:hover .MuiOutlinedInput-input": {
      color: "#ffc6c6"
    },
    "&:hover .MuiInputLabel-root": {
      color: "#ffc6c6"
    },
    "&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
      borderColor: "#ffc6c6"
    },
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-input": {
      color: "#ffc6c6"
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#ffc6c6"
    },
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#ffc6c6"
    },
    "& .MuiOutlinedInput-root .MuiSelect-iconOutlined": {
      color: "#d5d5d5"
    },
    "& .MuiOutlinedInput-root.Mui-focused .MuiSelect-iconOutlined": {
      color: "#ffc6c6"
    }
  },
  buttonRoot: {
    "&:disabled": {
      background: "#d5d5d5"
    }
  }
});

const MINT_PRICE_SOL = Number(process.env.NEXT_PUBLIC_MINT_PRICE_SOL!)

const Home = () => {
  const [balance] = useWalletBalance()
  const [isActive, setIsActive] = useState(false);
  const wallet = useWallet();

  const { isSoldOut, mintStartDate, isMinting, onMint, onMintMultiple, nftsData } = useCandyMachine()

  const [mintCount, setMintCount] = useState(1);

  const handleMintCountChange = (event: any) => {
    setMintCount(event.target.value);
  };

  const onClickMint = () => {
    if (mintCount === 1) {
      onMint();
    } else {
      onMintMultiple(mintCount);
    }
  };

  const classes = useStyles();

  return (
    <main className="p-5 md:min-h-screen flex-1 flex flex-col">
      <Toaster />
      <Head>
        <title>Mint | Jacked Moose</title>
        <meta name="description" content="Jacked Moose is an NFT collection made of 1200 unique disguises built on the Solana blockchain." />
        <link rel="icon" href="/favicon.png" />
      </Head>

      <Header connected={wallet.connected} />

      <div className="flex justify-center md:items-center flex-1">
        <div className="md:flex md:justify-center mt-10 md:mt-1">
          <div className="flex justify-center md:mx-20 items-center flex-1 space-y-3">
            <img
              className="rounded-md shadow-lg"
              src={`/mds.gif`}
              height={300}
              width={300}
              alt="NFT Image" />
          </div>
          <div className="flex flex-col justify-center md:mx-20 items-center flex-1 space-y-3 text-center">
            <span className="font-bold text-2xl cursor-default">
              WELCOME TO JACKED MOOSE!
            </span>

            {!wallet.connected && <span
              className="font-bold text-2xl cursor-default">
              NOT CONNECTED, PLEASE CLICK SELECT WALLET...
            </span>}

            {wallet.connected &&
              <p className="font-bold text-lg cursor-default">Address: {shortenAddress(wallet.publicKey?.toBase58() || "")}</p>
            }

            {wallet.connected &&
              <>
                <p className="font-bold text-lg cursor-default">Mint Price: {MINT_PRICE_SOL} SOL</p>
                <p className="font-bold text-lg cursor-default">Balance: {(balance || 0).toLocaleString()} SOL</p>
                <p className="font-bold text-lg cursor-default">Minted / Total: {nftsData.itemsRedeemed} / {nftsData.itemsAvailable}</p>
              </>
            }

            {!isSoldOut && !isActive && 
              <Countdown
                date={mintStartDate}
                onMount={({ completed }) => completed && setIsActive(true)}
                onComplete={() => setIsActive(true)}
                renderer={renderCounter}
              />
            }

            <div className="flex flex-row justify-center items-center space-x-5">
              {wallet.connected &&
                <>
                  <TextField
                    className={classes.selectRoot}
                    value={mintCount}
                    onChange={handleMintCountChange}
                    variant="outlined"
                    label="Mint Count"
                    select
                  >
                    {
                      (new Array(20).fill(null)).map((_, idx) => 
                        <MenuItem key={idx} value={idx + 1}>{ idx + 1 }</MenuItem>
                      )
                    }
                  </TextField>
                  <Button 
                    variant="contained"
                    size="large"
                    className={classes.buttonRoot}
                    disabled={isSoldOut || isMinting || !isActive}
                    onClick={onClickMint}
                  >
                    {isSoldOut ? (
                      "SOLD OUT"
                      ) : isActive ? (
                        isMinting ? 
                        <CircularProgress /> :
                        <span>MINT</span>
                      ) : (
                        <span>MINT</span>
                      )
                    }
                  </Button>
                </>
              }
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const renderCounter = ({ days, hours, minutes, seconds }: any) => {
  return (
    <p className="font-bold cursor-default">
      Live in {days} days, {hours} hours, {minutes} minutes, {seconds} seconds
    </p>
  );
};

export default Home;



