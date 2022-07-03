import TonWeb from "tonweb";

import tonMnemonic from "tonweb-mnemonic";

import fs from "fs";

export const getKeyPair = async function(words) {
    const seed = await tonMnemonic.mnemonicToSeed(words);
    return TonWeb.utils.nacl.sign.keyPair.fromSeed(seed);
};

export const createWallet = async (tonweb, keyPair) => {
    // const tonweb = new TonWeb(new TonWeb(
    //     "https://testnet.toncenter.com/api/v2/jsonRPC",
    //     { apiKey: "0866525e38cf9e0f6a2f5172b13c0d71b8d2f2158322bbaca85b13adeec9dc7a" }
    //   )
    // );

    // There are standard wallet smart contracts that everyone uses.
    // There are several versions, at the moment wallet v3R2 is default.

    const WalletClass = tonweb.wallet.all.v4R2;

    const wallet = new WalletClass(tonweb.provider, {
        publicKey: keyPair.publicKey,
        wc: 0
    });
    /** @type {Address} */
    const address = await wallet.getAddress();

    console.log(address.toString(true, true, true)); // print address in default format. In 99% of cases this format is used in UI applications.


};

// async function init() {
//   let words = fs.readFileSync("./seedphraseA.txt", { encoding: "utf8" }).split(" ");
//   console.log(words);
//   let keyPair = await getKeyPair(words);
//   await createWallet(keyPair);
// }
//
// init();