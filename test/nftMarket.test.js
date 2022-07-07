const { assert, expect } = require("chai");
const { network, deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("NftMarketplace", () => {
      let nftMarketplace,
        nftMarketplaceContract,
        basicNft,
        basicNftContract,
        user;
      const PRICE = ethers.utils.parseEther("0.1");
      const TOKEN_ID = 0;
      beforeEach(async () => {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        user = accounts[1];
        await deployments.fixture(["all"]);
        nftMarketplaceContract = await ethers.getContract("NftMarketplace");
        nftMarketplace = nftMarketplaceContract.connect(deployer);
        basicNftContract = await ethers.getContract("BasicNFT");
        basicNft = basicNftContract.connect(deployer);
        await basicNft.mintNft();
        await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID);
      });

      describe("listItem", () => {
        it("emits an event after listing an item", async () => {
          expect(
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.emit("ItemListed");
        });

        it("shows error when listed item is listed for the second time", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          const error = `NftMarketplace__AlreadyListed("${basicNft.address}", ${TOKEN_ID})`;
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith(error);
        });

        it("do not allow approved owner to list NFTs", async () => {
          nftMarketplace = nftMarketplaceContract.connect(user);
          await basicNft.approve(user.address, TOKEN_ID);
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__NotOwner");
        });

        it("error when contract is not approved to list NFTs", async () => {
          await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID);
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__MarketNotApprovedToListToken");
        });

        it("Updates the listing with seller and price", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          const listing = await nftMarketplace.getListing(
            basicNft.address,
            TOKEN_ID
          );
          assert.equal(listing.price.toString(), PRICE.toString());
          assert.equal(listing.seller.toString(), deployer.address);
        });
      });

      describe("buy Item", () => {
        it("reverts if the item is not listed", async () => {
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith(
            `NftMarketplace__NotListed("${basicNft.address}", ${TOKEN_ID})`
          );
        });

        it("reverts if the price isn't met", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith(
            `NftMarketplace__SentValueLessThanPrice("${basicNft.address}", ${TOKEN_ID}, ${PRICE})`
          );
        });

        it("transfers the NFT when price is met", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          nftMarketplace = nftMarketplaceContract.connect(user);
          expect(
            await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: PRICE,
            })
          ).to.emit("ItemBought");
          const newOwner = await basicNft.ownerOf(TOKEN_ID);
          const ownerProfits = await nftMarketplace.getProfits(
            deployer.address
          );
          assert.equal(newOwner, user.address);
          assert.equal(ownerProfits.toString(), PRICE.toString());
        });
      });

      describe("cancelListing", function () {
        it("reverts if there is no listing", async function () {
          await expect(
            nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith(
            `NftMarketplace__NotListed("${basicNft.address}", ${TOKEN_ID})`
          );
        });

        it("reverts if anyone but the owner tries to call", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          await basicNft.approve(user.address, TOKEN_ID);
          nftMarketplace = nftMarketplaceContract.connect(user);

          await expect(
            nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith("NftMarketplace__NotOwner");
        });

        it("emits event and removes listing", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          expect(
            await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.emit("ItemCanceled");
          const listing = await nftMarketplace.getListing(
            basicNft.address,
            TOKEN_ID
          );
          assert(listing.price.toString() == "0");
        });
      });

      describe("update Listing", () => {
        it("must be owner and listed", async () => {
          await expect(
            nftMarketplace.updateListing(
              basicNft.address,
              TOKEN_ID,
              ethers.utils.parseEther("0.2")
            )
          ).to.be.revertedWith(
            `NftMarketplace__NotListed("${basicNft.address}", ${TOKEN_ID})`
          );
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          nftMarketplace = nftMarketplaceContract.connect(user);
          await expect(
            nftMarketplace.updateListing(
              basicNft.address,
              TOKEN_ID,
              ethers.utils.parseEther("0.2")
            )
          ).to.be.revertedWith("NftMarketplace__NotOwner");
        });

        it("updates the price of the item", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          await nftMarketplace.updateListing(
            basicNft.address,
            TOKEN_ID,
            ethers.utils.parseEther("0.2")
          );

          const listing = await nftMarketplace.getListing(
            basicNft.address,
            TOKEN_ID
          );
          assert.equal(
            listing.price.toString(),
            ethers.utils.parseEther("0.2").toString()
          );
        });
      });

      describe("withdraw profits", () => {
        it("doesn't allow 0 profit withdrawl", async () => {
          await expect(nftMarketplace.withdrawProfits()).to.be.revertedWith(
            "NftMarketplace__NoProfits"
          );
        });

        it("withdraws profits after selling NFT", async () => {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
          nftMarketplace = nftMarketplaceContract.connect(user);
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
            value: PRICE,
          });
          nftMarketplace = nftMarketplaceContract.connect(deployer);

          const deployerProfitsBefore = await nftMarketplace.getProfits(
            deployer.address
          );
          const deployerBalanceBefore = await deployer.getBalance();
          const txResponse = await nftMarketplace.withdrawProfits();
          const tx = await txResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = tx;
          const gasPrice = gasUsed.mul(effectiveGasPrice);
          const deployerBalanceAfter = await deployer.getBalance();

          assert.equal(
            deployerBalanceAfter.add(gasPrice).toString(),
            deployerProfitsBefore.add(deployerBalanceBefore).toString()
          );
          assert.equal(
            (await nftMarketplace.getProfits(deployer.address)).toString(),
            "0"
          );
        });
      });
    });
