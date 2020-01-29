const MockDate = require("mockdate");
const bitcoinMessage = require("bitcoinjs-message");

const { Blockchain } = require("../src/blockchain");

jest.mock("bitcoinjs-message");

/*
 eslint-disable no-underscore-dangle
*/
describe("Blockchain", () => {
  beforeAll(() => {
    MockDate.set("2020-01-01");
  });

  let blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  describe("- when initialized", () => {
    test("it should have first genesis block", () => {
      expect(blockchain.chain.length).toBe(1);

      let block = blockchain.chain[0];
      expect(block.isGenesis).toBeTruthy();
    });

    test("it should be height of zero", async () => {
      const height = await blockchain.getChainHeight();
      expect(height).toBe(0);
    });
  });

  describe("- when searching through", () => {
    let firstBlock, secondBlock, thirdBlock;

    beforeEach(() => {
      firstBlock = blockchain._createCandidateBlock({
        name: "First Block"
      });
      blockchain._addBlock(firstBlock);

      secondBlock = blockchain._createCandidateBlock({
        name: "Second Block"
      });
      blockchain._addBlock(secondBlock);

      thirdBlock = blockchain._createCandidateBlock({
        name: "Third Block"
      });
      blockchain._addBlock(thirdBlock);
    });

    test("it should return block by hash", async () => {
      const found = await blockchain.getBlockByHash(
        "8992c4dcb10eb08c683c9f6232be2ddecb1e070b288088a260a467a768595a53"
      );
      expect(found).toBeDefined();
      expect(found).toStrictEqual(firstBlock);
    });

    test("it should return block by height", async () => {
      const found = await blockchain.getBlockByHeight(3);
      expect(found).toBeDefined();
      expect(found.height).toBe(3);
      expect(found).toStrictEqual(thirdBlock);
    });
  });

  describe("- when submitting star", () => {
    const starData = {
      dec: "Alpha",
      ra: "16h 29m 1s",
      story: "My First Star!"
    };

    beforeEach(() => {
      bitcoinMessage.verify.mockReturnValue(true);
    });

    test("it should add new block with wallet and star data", async () => {
      const block = await blockchain.submitStar(
        "WALLET_1",
        "WALLET_1:1577836740:starRegistry",
        "W1_SIGNATURE",
        starData
      );

      expect(block).not.toBeNull();
      const data = await block.getBData();
      expect(data.star).toStrictEqual(starData);
      expect(data.address).toBe("WALLET_1");
    });

    test("it should throw error if ownership verification message timestamp is older than 5 minutes", async () => {
      try {
        await blockchain.submitStar(
          "WALLET_1",
          "WALLET_1:1577836440:starRegistry",
          "W1_SIGNATURE",
          starData
        );
      } catch (e) {
        expect(e.message).toBe(
          "Ownership verification message should not be older than 5 minutes."
        );
      }
    });

    test("it should throw error if message cannot be verified with wallet", async () => {
      bitcoinMessage.verify.mockReturnValue(false);

      try {
        await blockchain.submitStar(
          "WALLET_1",
          "WALLET_1:1577836750:starRegistry",
          "W1_SIGNATURE",
          starData
        );
      } catch (e) {
        expect(e.message).toBe("Failed to verify message with wallet.");
      }
    });

    test("it should find star data by wallet address", async () => {
      const secondStar = { ...starData, dec: "Beta", story: "Second star!" };
      const thirdStar = { ...starData, dec: "Gamma", story: "Third star!" };

      await blockchain.submitStar(
        "WALLET_1",
        "WALLET_1:1577836740:starRegistry",
        "W1_SIGNATURE",
        starData
      );

      await blockchain.submitStar(
        "WALLET_2",
        "WALLET_2:1577836720:starRegistry",
        "W1_SIGNATURE",
        secondStar
      );

      await blockchain.submitStar(
        "WALLET_1",
        "WALLET_1:1577836640:starRegistry",
        "W1_SIGNATURE",
        thirdStar
      );

      const data = await blockchain.getStarsByWalletAddress("WALLET_1");
      expect(data.length).toBe(2);
      const stars = data.map(e => e.star);
      expect(stars).toContainEqual(starData);
      expect(stars).toContainEqual(thirdStar);
      expect(data.every(e => e.owner === "WALLET_1")).toBeTruthy();
    });
  });

  describe("- when validating", () => {
    beforeEach(async () => {
      await blockchain.submitStar(
        "WALLET_1",
        "WALLET_1:1577836740:starRegistry",
        "W1_SIGNATURE",
        { dec: "Alfa" }
      );

      await blockchain.submitStar(
        "WALLET_2",
        "WALLET_2:1577836720:starRegistry",
        "W1_SIGNATURE",
        { dec: "Beta" }
      );

      await blockchain.submitStar(
        "WALLET_1",
        "WALLET_1:1577836640:starRegistry",
        "W1_SIGNATURE",
        { dec: "Gamma" }
      );
    });

    test("should succeed if everything's valid", async () => {
      const errors = await blockchain.validateChain();

      expect(errors.length).toBe(0);
    });

    test("should fail if contains block with invalid previous hash", async () => {
      blockchain.chain[2].previousBlockHash = "INVALID1";

      const errors = await blockchain.validateChain();

      expect(errors.length).toBe(2);
      expect(errors).toContainEqual("Invalid hash for block #2");
      expect(errors).toContainEqual("Invalid previous block hash for block #2");
    });

    test("should fail if block hash invalid", async () => {
      blockchain.chain[1].body = "CHANGED";

      const errors = await blockchain.validateChain();

      expect(errors.length).toBe(1);
      expect(errors).toContainEqual("Invalid hash for block #1");
    });
  });
});
