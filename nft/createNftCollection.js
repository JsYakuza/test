import {NftCollection} from "tonweb/dist/types/contract/token/nft/nft-collection";
import {NftItem} from "tonweb/dist/types/contract/token/nft/nft-item.js";
import TonWeb from "tonweb";

export function createCollection(tonweb, walletAddress) {
    return new NftCollection(tonweb.provider, {
        ownerAddress: walletAddress,
        royalty: 0.13,
        royaltyAddress: walletAddress,
        collectionContentUri: 'http://localhost:63342/nft-marketplace/my_collection.json',
        nftItemContentBaseUri: 'http://localhost:63342/nft-marketplace/',
        nftItemCodeHex: NftItem.codeHex
    });
}

export async function deployCollection(collection, wallet, secretKey) {
    const seqno = (await wallet.methods.seqno().call()) || 0;

        await wallet.methods.transfer({
            secretKey: secretKey,
            toAddress: collection.toString(true, true, true),
            amount: TonWeb.utils.toNano('1'),
            seqno: seqno,
            payload: null, // body
            sendMode: 3,
            stateInit: (await collection.createStateInit()).stateInit
        }).send()
}