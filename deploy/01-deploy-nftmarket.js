const { network, getNamedAccounts, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("_________________________________________________");
  log("                                                 ");

  const args = [];
  const nftMarketplace = await deploy("NftMarketplace", {
    from: deployer,
    log: true,
    args: args,
    waitConfirmation: network.config.blockConfirmation || 1,
  });
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying..........");
    await verify(nftMarketplace.address, args);
  }
  log("                                                   ");
  log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
};

module.exports.tags = ["all", "nftmarketplace"];
