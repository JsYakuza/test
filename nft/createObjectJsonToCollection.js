function createJsonAd(
  mainParams,
  additionalParams,
  prices,
  timing,
  host,
  walletAddress
) {
    return JSON.stringify({
        mainParams: mainParams,
        additionalParams: additionalParams,
        prices: prices,
        timing: timing,
        host: host,
        walletAddress: walletAddress,
    })
}

export default createJsonAd;