const MockDate = require("mockdate");

const { Blockchain } = require("../src/blockchain");

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

  describe("- when searched through", () => {
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
        "654afcb60c72412516358455e9c31b26c31550fc9edfcab3e6dc44e658a55384"
      );
      expect(found).toBeDefined();
      expect(found.hash).toBe(
        "654afcb60c72412516358455e9c31b26c31550fc9edfcab3e6dc44e658a55384"
      );
      expect(found).toStrictEqual(firstBlock);
    });

    test("it should return block by height", async () => {
      const found = await blockchain.getBlockByHeight(3);
      expect(found).toBeDefined();
      expect(found.height).toBe(3);
      expect(found).toStrictEqual(thirdBlock);
    });
  });
});
