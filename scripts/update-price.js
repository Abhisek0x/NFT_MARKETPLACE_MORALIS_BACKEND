const { ethers, network } = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks");

const TOKEN_ID = 2;

async function updateItem() {
  const nftMarketplace = await ethers.getContract("NftMarketplace");
  const basicNft = await ethers.getContract("BasicNFT");
  const price = ethers.utils.parseEther("1");
  const tx = await nftMarketplace.updateListing(
    basicNft.address,
    TOKEN_ID,
    price
  );
  await tx.wait(1);
  console.log("Item Updated");
  if ((network.config.chainId = "31337")) {
    await moveBlocks(2, (sleepAmount = 1000));
  }
}

updateItem()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
