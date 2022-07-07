//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
//import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

//errors
/*
 * @notice These Errors are used to revert a Transaction if required condition is not satisfied
 */
error NftMarketplace__ListingPriceCannotBeZero();
error NftMarketplace__MarketNotApprovedToListToken();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__SentValueLessThanPrice(
    address nftAddress,
    uint256 tokenId,
    uint256 price
);
error NftMarketplace__NoProfits();
error NftMarketplace__WithdrawFailed();

contract NftMarketplace is ReentrancyGuard {
    /*
     * @notice Structs
     */

    struct Listing {
        uint256 price;
        address seller;
    }

    /*
     * @notice Mapping
     */
    // NFT Contract Address -> NFT Token Id -> Struct Listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;
    // Seller Address -> Value earned by selling NFTs
    mapping(address => uint256) private s_profits;
    /*
     * @dev @notice Variables
     * @Chainlink price Feed can be added
     */
    //AggregatorV3Interface internal immutable i_priceFeed;

    /*
     * @notice Events
     */

    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemListingCancelled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    event ItemListingUpdated(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 newprice
    );

    /*
     * @notice Modifiers
     */
    modifier notListed(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (spender != owner) {
            revert NftMarketplace__NotOwner();
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    // constructor(address priceFeedAddress) {
    //     i_priceFeed = AggregatorV3Interface(priceFeedAddress);
    // }

    /*
     * @notice Method to List NFTs in Marketplace
     * @param nftaddress: Address of the Listing NFT Contract
     * @param tokenId: Token Id of NFT for that NFT Contract
     * @param price: Price at which you want to list those NFTs
     */
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    )
        external
        notListed(nftAddress, tokenId, msg.sender)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        //(, int256 priceOfToken, , , ) = i_priceFeed.latestRoundData();
        if (price <= 0) {
            revert NftMarketplace__ListingPriceCannotBeZero();
        }

        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__MarketNotApprovedToListToken();
        }
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    /*
     * @notice Method to Buy NFTs from Marketplace
     * @param nftaddress: Address of the Listing NFT Contract
     * @param tokenId: Token Id of NFT for that NFT Contract
     */
    function buyItem(address nftAddress, uint256 tokenId)
        external
        payable
        isListed(nftAddress, tokenId)
        nonReentrant
    {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert NftMarketplace__SentValueLessThanPrice(
                nftAddress,
                tokenId,
                listedItem.price
            );
        }
        s_profits[listedItem.seller] = s_profits[listedItem.seller] + msg.value;
        delete (s_listings[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(
            listedItem.seller,
            msg.sender,
            tokenId
        );
        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price);
    }

    /*
     * @notice Method to cancel Listed NFTs from Marketplace
     * @param nftaddress: Address of the Listing NFT Contract
     * @param tokenId: Token Id of NFT for that NFT Contract
     */
    function cancelListing(address nftAddress, uint256 tokenId)
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemListingCancelled(msg.sender, nftAddress, tokenId);
    }

    /*
     * @notice Method to update Listed NFTs on Marketplace
     * @param nftaddress: Address of the Listing NFT Contract
     * @param tokenId: Token Id of NFT for that NFT Contract
     * @param tokenId: New Price of the NFT
     */
    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    )
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemListingUpdated(msg.sender, nftAddress, tokenId, newPrice);
    }

    /*
     * @notice Method to withdraw all the profits of selling NFTs
     * @param nftaddress: Address of the Listing NFT Contract
     * @param tokenId: Token Id of NFT for that NFT Contract
     */
    function withdrawProfits() external {
        uint256 profits = s_profits[msg.sender];
        if (profits <= 0) {
            revert NftMarketplace__NoProfits();
        }
        s_profits[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: profits}("");
        if (!success) {
            revert NftMarketplace__WithdrawFailed();
        }
    }

    ////////////////////////////
    /////////Getters////////////
    ////////////////////////////

    function getListing(address nftAddress, uint256 tokenID)
        external
        view
        returns (Listing memory)
    {
        return s_listings[nftAddress][tokenID];
    }

    function getProfits(address seller) external view returns (uint256) {
        return s_profits[seller];
    }
}
