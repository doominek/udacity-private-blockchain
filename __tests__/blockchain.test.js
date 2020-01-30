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

      const height = await blockchain.getChainHeight();
      expect(height).toBe(3);

      const stars = data.map(e => e.star);
      expect(stars).toContainEqual(starData);
      expect(stars).toContainEqual(thirdStar);
      expect(data.every(e => e.owner === "WALLET_1")).toBeTruthy();
    });
  });

  describe("- after adding blocks", () => {
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

    test("it should succeed if everything's valid", async () => {
      const errors = await blockchain.validateChain();

      expect(errors.length).toBe(0);
    });

    test("it should fail if contains block with invalid previous hash", async () => {
      blockchain.chain[2].previousBlockHash = "INVALID1";

      const errors = await blockchain.validateChain();

      expect(errors.length).toBe(2);
      expect(errors).toContainEqual("Invalid hash for block #2");
      expect(errors).toContainEqual("Invalid previous block hash for block #2");
    });

    test("it should fail if block hash invalid", async () => {
      blockchain.chain[1].body = "CHANGED";

      const errors = await blockchain.validateChain();

      expect(errors.length).toBe(1);
      expect(errors).toContainEqual("Invalid hash for block #1");
    });

    test("it should find block by hash", async () => {
      const firstBlock = {
        hash:
          "57f45af454e6f834488d69a106bd5607282bb91c4956e2938515b5855359a810",
        height: 1,
        body:
          "7b2273746172223a7b22646563223a22416c6661227d2c2261646472657373223a2257414c4c45545f31227d",
        time: 1577836800,
        previousBlockHash:
          "0b3ced3dae46d3313b5a9b112b7e3f33eb1717255b2719f7c5c1563774ad5ffd"
      };

      const found = await blockchain.getBlockByHash(firstBlock.hash);

      expect(found).toBeDefined();
      expect(found).toEqual(firstBlock);
    });

    test("it should find block by height", async () => {
      const thirdBlock = {
        hash:
          "0636d9150ad8fa2d2d33a6ca6310da2ce80d05f1c42e4ae0ef0dee40864e64e3",
        height: 3,
        body:
          "7b2273746172223a7b22646563223a2247616d6d61227d2c2261646472657373223a2257414c4c45545f31227d",
        time: 1577836800,
        previousBlockHash:
          "4b577566e70b0b34f6babc7826247c834bff0b880de4028e5fa38597b872821c"
      };

      const found = await blockchain.getBlockByHeight(3);
      expect(found).toBeDefined();
      expect(found.height).toBe(3);
      expect(found).toEqual(thirdBlock);
    });
  });
});
