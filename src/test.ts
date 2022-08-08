import { ethers } from "ethers";
import { ContractReceipt } from "ethers/contract";
import { load } from "ts-dotenv";
import invariant from "tiny-invariant";
import * as fs from "fs/promises";

const endpoints = [
  // "https://forno.celo.org",
  // "https://rpc.ankr.com/celo",
  "https://chaotic-tiniest-asphalt.celo-mainnet.discover.quiknode.pro/2fc0e56df28958791722e76f556e061b611c57f4/",
  // "wss://chaotic-tiniest-asphalt.celo-mainnet.discover.quiknode.pro/2fc0e56df28958791722e76f556e061b611c57f4/",
  // "https://celo-mainnet--rpc.datahub.figment.io/apikey/dbc541e98aeb3b440fc93d7461fde8ac",
  // "https://celo-mainnet-rpc.allthatnode.com/psykb4NCHqB85xJFkmRFiXcMzzg3bIjB",
];

const Kyle = "0x59A6AbC89C158ef88d5872CaB4aC3B08474883D9";

enum AwaitMethod {
  Wait = "Wait",
  On = "On",
}

interface Data {
  awaitMethod: string;
  sendMean: number;
  confirmMean: number;
  sendRawData: number[];
  confirmRawData: number[];
}
interface Output {
  endpoint: string;
  data: Data[];
}

export const testResponseTime = async (): Promise<void> => {
  let output: Output[] = [];
  for (let endpoint in endpoints) {
    console.log(endpoint);
    const provider = new ethers.providers.JsonRpcProvider(endpoint);
    console.log(1, provider);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("waited");
    const gasPrice = await provider.getGasPrice();
    console.log(2, gasPrice.toString());
    const env = load({
      MNEMONIC: String,
    });
    const wallet = ethers.Wallet.fromMnemonic(env.MNEMONIC);
    const signer = wallet.connect(provider);

    let outputData: Data[] = [];

    for (let awaitMethod in AwaitMethod) {
      let sendTimes: number[] = [];
      let confirmationTimes: number[] = [];

      for (let i = 0; i < 3; i++) {
        const startSend = Date.now();
        const transactionParameters = {
          to: Kyle,
          value: ethers.utils.parseUnits("0.00001", "ether"),
          gasPrice: gasPrice,
          gasLimit: ethers.utils.hexlify(100000),

          nonce: await provider.getTransactionCount(wallet.address, "latest"),
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
        } else {
          console.error("I wish typescript had pattern matching");
        }

        confirmationTimes = confirmationTimes.concat(Date.now() - startConfirm);
      }

      const means = [sendTimes, confirmationTimes].map(
        (times) =>
          times.reduce((acc, cur) => acc + cur, 0) / (times.length * 1000)
      );

      const data: Data = {
        awaitMethod: awaitMethod,
        sendMean: means[0]!,
        confirmMean: means[1]!,
        sendRawData: sendTimes,
        confirmRawData: confirmationTimes,
      };

      outputData = outputData.concat(data);
    }
    let out: Output = {
      endpoint,
      data: outputData,
    };

    output = output.concat(out);
  }

  await fs.writeFile("data/times.json", JSON.stringify(output, null, 2));
};

testResponseTime().catch((err) => {
  console.error(err);
});
