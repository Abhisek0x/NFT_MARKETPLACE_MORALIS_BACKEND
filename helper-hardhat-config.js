const networkConfig = {
  default: {
    name: "hardhat",
    keepersUpdateInterval: "30",
  },
  4: {
    name: "rinkeby",
    ethUsdPriceFeed: "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
    vrfCoordinatorV2: "0x6168499c0cffcacd319c818142124b7a15e857ab",
    mintFee: ethers.utils.parseEther("0.01"),
    gasLane:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
    subId: "6590",
    callbackGasLimit: "500000",
    interval: "10",
  },
  31337: {
    name: "localhost",
    mintFee: ethers.utils.parseEther("0.01"),
    subId: "6590",
    gasLane:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei,
    callbackGasLimit: "500000",
    interval: "30",
  },
};
const DECIMALS = "18";
const INITIAL_PRICE = "200000000000000000000";
const developmentChains = ["hardhat", "localhost"];

const frontEndContractsFile =
  "../marketplace-frontend/constants/networkMapping.json";
// const frontEndContractsFile2 =
//   ".././marketplace-frontend/constants/networkMapping.json";
// const frontEndAbiLocation = ".././marketplace-frontend/constants/";
// const frontEndAbiLocation2 =
//   "../nextjs-nft-marketplace-thegraph-fcc/constants/";

module.exports = {
  networkConfig,
  developmentChains,
  DECIMALS,
  INITIAL_PRICE,
  frontEndContractsFile,
  //   frontEndContractsFile2,
  //   frontEndAbiLocation,
};
