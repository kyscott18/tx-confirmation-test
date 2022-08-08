import { ethers } from "ethers";
import { ContractReceipt } from "ethers/contract";
import { load } from "ts-dotenv";
import invariant from "tiny-invariant";

const endpoints = ["https://forno.celo.org"];

const Kyle = "0x59A6AbC89C158ef88d5872CaB4aC3B08474883D9";

enum AwaitMethod {
  Wait,
  On,
}

const awaitMethod = AwaitMethod.On;

export const testResponseTime = async (): Promise<void> => {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://forno.celo.org"
  );
  const gasPrice = await provider.getGasPrice();
  const env = load({
    MNEMONIC: String,
  });
  const wallet = ethers.Wallet.fromMnemonic(env.MNEMONIC);
  const signer = wallet.connect(provider);

  let sendTimes: number[] = [];
  let confirmationTimes: number[] = [];

  for (let i = 0; i < 10; i++) {
    const startSend = Date.now();
    const transactionParameters = {
      to: Kyle,
      value: ethers.utils.parseUnits("0.00001", "ether"),
      gasPrice: gasPrice,
      gasLimit: ethers.utils.hexlify(100000),

      nonce: await provider.getTransactionCount(wallet.address, "latest"),
      chainId: 42220,
    };
    const tx = await signer.sendTransaction(transactionParameters);
    const hash = tx.hash;
    invariant(hash);
    sendTimes = sendTimes.concat(Date.now() - startSend);
    const startConfirm = Date.now();
    if (awaitMethod === AwaitMethod.On) {
      await new Promise((resolve: (e: ContractReceipt) => void) =>
        provider.once(hash, (e: ContractReceipt) => {
          resolve(e);
          return e;
        })
      );
    } else if (awaitMethod === AwaitMethod.Wait) {
      await tx.wait();
    }
    confirmationTimes = confirmationTimes.concat(Date.now() - startConfirm);
  }

  const means = [sendTimes, confirmationTimes].map(
    (times) => times.reduce((acc, cur) => acc + cur, 0) / (times.length * 1000)
  );

  console.log("Send Time Mean:", means[0], "all data:", sendTimes);
  console.log(
    "Confirmation Time Mean:",
    means[1],
    "all data:",
    confirmationTimes
  );
};

testResponseTime().catch((err) => {
  console.error(err);
});
