import TonWeb from "tonweb";

// parameters for implement RENT, Wallet1, Wallet2
async function init() {
    // To check you can use blockchain explorer https://testnet.tonscan.org/address/<CHANNEL_ADDRESS>
    // To check you can use blockchain explorer https://testnet.tonscan.org/address/<WALLET_ADDRESS>
    // seed need to be 32 symbols length

    const toNano = TonWeb.utils.toNano;
    const BN = TonWeb.utils.BN;

    const RENT_FOR_APARTMENTS = new BN(10);

    const testData = {
        wallet1Address: 'EQAo9xZNbHNlYybACpUTypnenMF0BEM7x61xJFSH8yi2BMyT',
        wallet2Address: 'EQD1lmMAKpmk7hjSMyPIMXY4oYJzlZ9z7Ab070P9qhpqXqt9',
    }

    const tonweb = new TonWeb(
        new TonWeb.HttpProvider(
            'https://testnet.toncenter.com/api/v2/jsonRPC',
            {apiKey: '9a4a7def07d155aad897052ffd7904ee1b24d7ad0baad4c9c6c120a8fd4c9f41'})
    )
    const seedA = TonWeb.utils.newSeed();
    const keyPairA = tonweb.utils.keyPairFromSeed(seedA);

    const seedB = TonWeb.utils.newSeed();
    const keyPairB = tonweb.utils.keyPairFromSeed(seedB);

    const walletA = tonweb.wallet.create({
        address: testData.wallet1Address,
    });
    const walletAddressA = await walletA.getAddress();

    const walletB = tonweb.wallet.create({
        address: testData.wallet2Address,
    });
    const walletAddressB = await walletB.getAddress();

    let balanceWalletA = await tonweb.getBalance(walletAddressA);
    let balanceWalletB = await tonweb.getBalance(walletAddressB);

    if (balanceWalletA < RENT_FOR_APARTMENTS) {
        throw new Error('Top Up Your balance on sum ' + RENT_FOR_APARTMENTS + 'ton');
    }

    const channelInitState = {
        balanceA: new BN(0),
        balanceB: new BN(0),
        seqnoA: new TonWeb.utils.BN(0),
        seqnoB: new TonWeb.utils.BN(0)
    };

    const channelConfig = {
        channelId: new TonWeb.utils.BN(Date.now() / 1000),
        addressA: walletAddressA,
        addressB: walletAddressB,
        initBalanceA: channelInitState.balanceA,
        initBalanceB: channelInitState.balanceB
    }
    //
    const channelA = tonweb.payments.createChannel({
        ...channelConfig,
        isA: true,
        myKeyPair: keyPairA,
        hisPublicKey: keyPairB.publicKey,
    });
    const channelAddress = await channelA.getAddress();
    console.log('channelAddress=', channelAddress.toString(true, true, true));

    const channelB = tonweb.payments.createChannel({
        ...channelConfig,
        isA: false,
        myKeyPair: keyPairB,
        hisPublicKey: keyPairA.publicKey,
    });

    if ((await channelB.getAddress()).toString() !== channelAddress.toString()) {
        throw new Error('Channels address not same');
    }

    const fromWalletA = channelA.fromWallet({
        wallet: walletA,
        secretKey: keyPairA.secretKey
    });

    const fromWalletB = channelB.fromWallet({
        wallet: walletB,
        secretKey: keyPairB.secretKey
    });

    await fromWalletA.deploy().send(toNano('0.05'));

    await fromWalletA
        .topUp({coinsA: channelInitState.balanceA, coinsB: new BN(0)})
        .send(channelInitState.balanceA.add(toNano('0.05')));

    await fromWalletB
        .topUp({coinsA: new BN(0), coinsB: channelInitState.balanceB})
        .send(channelInitState.balanceB.add(toNano('0.05')));

    await fromWalletA.init(channelInitState).send(toNano('0.05'));

    const channelState1 = {
        balanceA: balanceWalletA,
        balanceB: balanceWalletB,
        seqnoA: new BN(0),
        seqnoB: new BN(0)
    };

    const signatureA1 = await channelA.signState(channelState1);

    if (!(await channelB.verifyState(channelState1, signatureA1))) {
        throw new Error('Invalid A signature');
    }
    const signatureB1 = await channelB.signState(channelState1);

    const sumState2 = balanceWalletA - RENT_FOR_APARTMENTS;
    balanceWalletA = sumState2;

    const channelState2 = {
        balanceA: sumState2,
        balanceB: balanceWalletB,
        seqnoA: new BN(1),
        seqnoB: new BN(0)
    };

    const signatureA2 = await channelA.signState(channelState2);

    const isFirstStepVerified = await channelB.verifyState(channelState2, signatureA2);
    if (!isFirstStepVerified) {
        throw new Error('Invalid A signature');
    }
    const signatureB2 = await channelB.signState(channelState2);

    const channelState3 = {
        balanceA: balanceWalletA,
        balanceB: balanceWalletB + RENT_FOR_APARTMENTS,
        seqnoA: new BN(1),
        seqnoB: new BN(1)
    };

    const signatureB3 = await channelB.signState(channelState3);

    const isSecondStepVerified = await channelA.verifyState(channelState3, signatureB3);
    if (!isSecondStepVerified) {
        throw new Error('Invalid B signature');
    }
    const signatureA3 = await channelA.signState(channelState3);

    const isUserMoneyOnWallet = isFirstStepVerified && isSecondStepVerified;

    if (isUserMoneyOnWallet) {
        const signatureCloseB = await channelB.signClose(channelState3);


        if (!(await channelA.verifyClose(channelState3, signatureCloseB))) {
            throw new Error('Invalid B signature');
        }

        await fromWalletA.close({
            ...channelState3,
            hisSignature: signatureCloseB
        }).send(toNano('0.05'));
    }
}

init();