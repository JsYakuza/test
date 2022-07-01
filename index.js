import TonWeb from "tonweb";
import {createCollection, deployCollection} from "./nft/createNftCollection.js";

async function init() {
    const tonweb = new TonWeb();
    const seed = tonweb.utils.newSeed()
    const keyPair = tonweb.utils.nacl.sign.keyPair.fromSeed(seed);
    const WalletClass = tonweb.wallet.all['v3R1'];
    const wallet = new WalletClass(tonweb.provider, {
        publicKey: keyPair.publicKey,
        wc: 0
    });

    const walletAddress = await wallet.getAddress()
    const collection = createCollection(tonweb, walletAddress);
    await deployCollection(collection, wallet, keyPair.secretKey);
}

init();