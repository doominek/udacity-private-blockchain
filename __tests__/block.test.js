const { Block } = require("../src/block");

const JAN_1ST_2020_UNIX_MILIS = 1577836800000;
Date.now = jest.fn(() => JAN_1ST_2020_UNIX_MILIS);

describe("Block", () => {
  describe("- when creating genesis block", () => {
    let block;

    beforeEach(() => {
      block = Block.createGenesisBlock();
    });

    test("it should have hash calculated", () => {
      expect(block.hash).toBe(
        "7e0f3795a30501b552a2d7eeba91095934445ec091b9978213a1c31aae49c348"
      );
    });

    test("it should have height equal to 0", () => {
      expect(block.height).toBe(0);
    });

    test("it should be identified as genesis block", () => {
      expect(block.isGenesis).toBeTruthy();
    });
  });

  describe("- when creating normal block", () => {
    let block;

    beforeEach(() => {
      block = new Block("TEST", 1);
    });

    test("raw data should be encoded in hex format in body", () => {
      expect(block.body).toBe("225445535422");
    });

    test("should not be identified as genesis block", () => {
      expect(block.isGenesis).toBeFalsy();
    });
  });

  describe("- should decode data from hex format", () => {
    test("for normal block", async () => {
      const block = new Block({ name: "Test" }, 1);
      const data = await block.getBData();
      expect(data).toStrictEqual({ name: "Test" });
    });

    test("and return null for Genesis block", async () => {
      const block = Block.createGenesisBlock();

      const data = await block.getBData();
      expect(data).toBeNull();
    });
  });
});
