const { Block } = require("../src/block");

describe("Block", () => {
  describe("- when creating new block", () => {
    let block;

    beforeEach(() => {
      block = new Block("TEST", 1);
    });

    test("data should be encoded in hex format in body", () => {
      expect(block.body).toBe("225445535422");
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
