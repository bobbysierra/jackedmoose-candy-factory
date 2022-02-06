import { useEffect, useState } from "react";
import * as anchor from "@project-serum/anchor";
import { awaitTransactionSignatureConfirmation, CandyMachine, getCandyMachineState, mintOneToken, mintMultipleToken } from "../utils/candy-machine";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from 'react-hot-toast';
import useWalletBalance from "./use-wallet-balance";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { sleep } from "../utils/utility";

const MINT_PRICE_SOL = Number(process.env.NEXT_PUBLIC_MINT_PRICE_SOL!);

const candyMachineId = new anchor.web3.PublicKey(
  process.env.NEXT_PUBLIC_CANDY_MACHINE_ID!
);

const rpcHost = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST!;
const connection = new anchor.web3.Connection(rpcHost);

const txTimeout = 30000;

export default function useCandyMachine() {
  const [, setBalance] = useWalletBalance()
  const wallet = useWallet();
  const [nftsData, setNftsData] = useState<any>({} = {
    itemsRemaining: 0,
    itemsRedeemed: 0,
    itemsAvailable: 0
  } as any);
  const [isMinting, setIsMinting] = useState(false);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [mintStartDate, setMintStartDate] = useState(new Date(parseInt(process.env.NEXT_PUBLIC_CANDY_START_DATE!, 10)));

  useEffect(() => {
    (async () => {
      if (
        !wallet ||
        !wallet.publicKey ||
        !wallet.signAllTransactions ||
        !wallet.signTransaction
      ) {
        return;
      }

      const anchorWallet = {
        publicKey: wallet.publicKey,
        signAllTransactions: wallet.signAllTransactions,
        signTransaction: wallet.signTransaction,
      } as anchor.Wallet;
      const candyMachine =
        await getCandyMachineState(
          anchorWallet,
          candyMachineId,
          connection
        );

      const { goLiveDate, itemsRemaining } = candyMachine.state;

      setIsSoldOut(itemsRemaining === 0);
      setMintStartDate(new Date(goLiveDate.toNumber() * 1000));
    })();
  }, [wallet, candyMachineId, connection]);

  useEffect(() => {
    (async () => {
      if (!isMinting) {
        const anchorWallet = {
          publicKey: wallet.publicKey,
          signAllTransactions: wallet.signAllTransactions,
          signTransaction: wallet.signTransaction,
        } as anchor.Wallet;

        const candyMachine =
          await getCandyMachineState(
            anchorWallet,
            candyMachineId,
            connection
          );

        const { itemsRemaining, itemsRedeemed, itemsAvailable } = candyMachine.state;

        setNftsData({ itemsRemaining, itemsRedeemed, itemsAvailable });
      }
    })();
  }, [wallet, candyMachineId, connection, isMinting]);

  const onMint = async () => {
    try {
      setIsMinting(true);
      const anchorWallet = {
        publicKey: wallet.publicKey,
        signAllTransactions: wallet.signAllTransactions,
        signTransaction: wallet.signTransaction,
      } as anchor.Wallet;
      const candyMachine =
        await getCandyMachineState(
          anchorWallet,
          candyMachineId,
          connection
        );

      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const mintTxId = (
          await mintOneToken(candyMachine, wallet.publicKey)
        )[0];

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            txTimeout,
            connection,
            'singleGossip',
            true,
          );
        }

        if (!status?.err) {
          toast.success("Congratulations! Mint succeeded!")
        } else {
          toast.error("Mint failed! Please try again!")
        }
      }
    } catch (error: any) {
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }
      toast.error(message)
    } finally {
      if (wallet?.publicKey) {
        const balance = await connection.getBalance(wallet?.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
    }
  };

  const onMintMultiple = async (quantity: number) => {
    try {
      setIsMinting(true);
      const anchorWallet = {
        publicKey: wallet.publicKey,
        signAllTransactions: wallet.signAllTransactions,
        signTransaction: wallet.signTransaction,
      } as anchor.Wallet;
      const candyMachine =
        await getCandyMachineState(
          anchorWallet,
          candyMachineId,
          connection
        );
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const oldBalance = await connection.getBalance(wallet?.publicKey) / LAMPORTS_PER_SOL;
        const futureBalance = oldBalance - (MINT_PRICE_SOL * quantity)

        const signedTransactions: any = await mintMultipleToken(
          candyMachine,
          wallet.publicKey,
          quantity
        );

        const promiseArray = []
        

        for (let index = 0; index < signedTransactions.length; index++) {
          const tx = signedTransactions[index];
          promiseArray.push(awaitTransactionSignatureConfirmation(
            tx,
            txTimeout,
            connection,
            "singleGossip",
            true
          ))
        }

        const allTransactionsResult = await Promise.all(promiseArray)
        let totalSuccess = 0;
        let totalFailure = 0;

        for (let index = 0; index < allTransactionsResult.length; index++) {
          const transactionStatus = allTransactionsResult[index];
          if (!transactionStatus?.err) {
            totalSuccess += 1
          } else {
            totalFailure += 1
          }
        }

        let newBalance = await connection.getBalance(wallet?.publicKey) / LAMPORTS_PER_SOL;

        while(newBalance > futureBalance) {
          await sleep(1000)
          newBalance = await connection.getBalance(wallet?.publicKey) / LAMPORTS_PER_SOL;
        }

        if(totalSuccess) {
          toast.success(`Congratulations! ${totalSuccess} mints succeeded!`, { duration: 6000, position: "bottom-center" })
        }

        if(totalFailure) {
          toast.error(`Some mints failed! ${totalFailure} mints failed! Check on your wallet :(`, { duration: 6000, position: "bottom-center" })
        }
      }
    } catch (error: any) {
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }
      toast.error(message)
    } finally {
      if (wallet?.publicKey) {
        const balance = await connection.getBalance(wallet?.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
    }
  };


  return { isSoldOut, mintStartDate, isMinting, nftsData, onMint, onMintMultiple }
}