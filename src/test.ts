import { ethers } from "ethers";
import { load } from "ts-dotenv";

const Kyle = "0x59A6AbC89C158ef88d5872CaB4aC3B08474883D9";

export const testResponseTime = async (): Promise<void> => {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://forno.celo.org"
  );
  const gasPrice = await provider.getGasPrice();
  const env = load({
    KEY: String,
  });
  const wallet = ethers.Wallet.fromMnemonic(
    "oak few hurt snack habit flame ivory style organ online wild hip"
  );
  const signer = wallet.connect(provider);

  const transactionParameters = {
    to: Kyle,
    value: ethers.utils.parseUnits("0.001", "ether"),
    gasPrice: gasPrice,
    gasLimit: ethers.utils.hexlify(100000),

    nonce: await provider.getTransactionCount(wallet.address, "latest"),
    chainId: 42220,
  };

  const tx = await signer.sendTransaction(transactionParameters);
  console.log(tx.hash);
  await tx.wait();
  console.log("done");
};

testResponseTime().catch((err) => {
  console.error(err);
});
