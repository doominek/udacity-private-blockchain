const MockDate = require("mockdate");

const { Block } = require("../src/block");

describe("Block", () => {
  beforeAll(() => {
    MockDate.set("2020-01-01");
  });

  describe("- when creating genesis block", () => {
    let block;

    beforeEach(() => {
      block = Block.createGenesisBlock();
    });

    test("it should have hash calculated", () => {
      expect(block.hash).toBe(
        "8d5019579e4ab02da5665eb3235b73ea33ef880071e5ff289238f2cc8dd15a11"
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

  afterAll(() => {
    MockDate.reset();
  });
});
