const { ethers, network } = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks");

async function mintAndList() {
  const PRICE = ethers.utils.parseEther("0.1");
  const nftMarketplace = await ethers.getContract("NftMarketplace");
  const basicNft = await ethers.getContract("BasicNFT");

  console.log("Minting...");
  const tx = await basicNft.mintNft();
  const txResponse = await tx.wait(1);
  const tokenId = await txResponse.events[0].args.tokenId;

  console.log("Approving");
  const approvaltx = await basicNft.approve(nftMarketplace.address, tokenId);
  const approvalResponse = await approvaltx.wait(1);

  console.log("Listing NFT in Marketplace");
  const txn = await nftMarketplace.listItem(basicNft.address, tokenId, PRICE);
  const txnRespnse = await txn.wait(1);
  console.log("NFT Listed");

  if (network.config.chainId == 31337) {
    await moveBlocks(2, (sleepAmount = 1000));
  }
}

mintAndList()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
