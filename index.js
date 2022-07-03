const TonWeb = require("tonweb");
const {getKeyPair, createWallet} = require("./seedphrase.js");
const utf8 = require('utf8');


export async function init(RENT_FOR_APARTMENTS, wordsA, wordsB, walletAddressA_, walletAddressB_) {
    // To check you can use blockchain explorer https://testnet.tonscan.org/address/<CHANNEL_ADDRESS>
    // To check you can use blockchain explorer https://testnet.tonscan.org/address/<WALLET_ADDRESS>
    // seed need to be 32 symbols length

    const toNano = TonWeb.utils.toNano;
    const BN = TonWeb.utils.BN;

    const tonweb = new TonWeb(
        new TonWeb.HttpProvider(
            "https://testnet.toncenter.com/api/v2/jsonRPC",
            {apiKey: "9a4a7def07d155aad897052ffd7904ee1b24d7ad0baad4c9c6c120a8fd4c9f41"})
    );
    //
    const keyPairA = await getKeyPair(utf8.encode(wordsA));
    const keyPairB = await getKeyPair(utf8.encode(wordsB));
    const WalletClass = tonweb.wallet.all.v4R2;

    // const wallet = new WalletClass(tonweb.provider, {
    //   publicKey: keyPair.publicKey,
    //   wc: 0
    // });

    const walletA = new WalletClass(tonweb.provider, {
        address: walletAddressA_,
        wc: 0
    });

    const walletB = new WalletClass(tonweb.provider, {
        address: walletAddressB_,
        wc: 0
    });

    const walletAddressA = await walletA.getAddress();
    const walletAddressB = await walletB.getAddress();

    let balanceWalletA = new BN(await tonweb.getBalance(walletAddressA));
    let balanceWalletB = new BN(await tonweb.getBalance(walletAddressB));

    if (Number(balanceWalletA) < Number(RENT_FOR_APARTMENTS)) {
        throw new Error("Top Up Your balance on sum " + RENT_FOR_APARTMENTS + "ton");
    }

    const channelInitState = {
        balanceA: toNano(RENT_FOR_APARTMENTS),
        balanceB: toNano('0'),
        seqnoA: new TonWeb.utils.BN(0),
        seqnoB: new TonWeb.utils.BN(0)
    };

    const channelConfig = {
        channelId: new TonWeb.utils.BN(Date.now() / 1000),
        addressA: walletAddressA,
        addressB: walletAddressB,
        initBalanceA: channelInitState.balanceA,
        initBalanceB: channelInitState.balanceB
    };
    //
    const channelA = tonweb.payments.createChannel({
        ...channelConfig,
        isA: true,
        myKeyPair: keyPairA,
        hisPublicKey: keyPairB.publicKey
    });
    const channelAddress = await channelA.getAddress();

    const channelB = tonweb.payments.createChannel({
        ...channelConfig,
        isA: false,
        myKeyPair: keyPairB,
        hisPublicKey: keyPairA.publicKey
    });

    if ((await channelB.getAddress()).toString() !== channelAddress.toString()) {
        throw new Error("Channels address not same");
    }

    const fromWalletA = channelA.fromWallet({
        wallet: walletA,
        secretKey: keyPairA.secretKey
    });

    const fromWalletB = channelB.fromWallet({
        wallet: walletB,
        secretKey: keyPairB.secretKey
    });

    await fromWalletA.deploy().send(toNano("0.05"));

    await fromWalletA
        .topUp({coinsA: channelInitState.balanceA, coinsB: new BN(0)})
        .send(channelInitState.balanceA.add(toNano("0.05")));

    await fromWalletB
        .topUp({coinsA: new BN(0), coinsB: channelInitState.balanceB})
        .send(channelInitState.balanceB.add(toNano("0.05")));
    let res = fromWalletA.init(channelInitState);
    await res.send(toNano("0.05"));

    const channelState2 = {
        balanceA: new BN('0'),
        balanceB: toNano(RENT_FOR_APARTMENTS),
        seqnoA: new BN(0),
        seqnoB: new BN(1)
    };

    const signatureA2 = await channelA.signState(channelState2);

    const isVerified = await channelB.verifyState(channelState2, signatureA2);
    if (!isVerified) {
        throw new Error("Invalid A signature");
    }

    const signatureB2 = await channelB.signState(channelState2);

    const signatureCloseA = await channelB.signClose(channelState2);


    if (!(await channelA.verifyClose(channelState2, signatureCloseA))) {
        throw new Error("Invalid A signature");
    }

    await fromWalletA.close({
        ...channelState2,
        hisSignature: signatureCloseA
    }).send(toNano("0.05"));
}
