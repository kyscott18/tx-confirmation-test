import { ethers } from "ethers";
import { ContractReceipt } from "ethers/contract";
import { load } from "ts-dotenv";
import invariant from "tiny-invariant";
import * as fs from "fs/promises";

const endpoints = ["https://forno.celo.org"];

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
  await Promise.all(
    endpoints.map(async (endpoint) => {
      const provider = new ethers.providers.JsonRpcProvider(endpoint);
      const gasPrice = await provider.getGasPrice();
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

          confirmationTimes = confirmationTimes.concat(
            Date.now() - startConfirm
          );
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
    })
  );

  await fs.writeFile("data/times.json", JSON.stringify(output, null, 2));
};

testResponseTime().catch((err) => {
  console.error(err);
});
