/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persistent storage method.
 *
 */

const bitcoinMessage = require("bitcoinjs-message");

const moment = require("moment");
const _ = require("lodash");

const { Block } = require("./block.js");
const {
  StarOwnershipVerificationMessage
} = require("./star-ownership-verification-message");

const MAX_OWNERSHIP_VERIFICATION_DURATION = moment.duration(5, "minutes");

class Blockchain {
  /**
   * Constructor of the class, you will need to setup your chain array and the height
   * of your chain (the length of your chain array).
   * Also every time you create a Blockchain class you will need to initialized the chain creating
   * the Genesis Block.
   * The methods in this class will always return a Promise to allow client applications or
   * other backends to call asynchronous functions.
   */
  constructor() {
    this.chain = [];
    this.height = -1;
    this.initializeChain();
  }

  /**
   * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
   * You should use the `addBlock(block)` to create the Genesis Block
   * Passing as a data `{data: 'Genesis Block'}`
   */
  async initializeChain() {
    if (this.height === -1) {
      const block = new Block({ data: "Genesis Block" });
      await this._addBlock(block);
    }
  }

  /**
   * Utility method that return a Promise that will resolve with the height of the chain
   */
  getChainHeight() {
    return new Promise(resolve => {
      resolve(this.height);
    });
  }

  /**
   * _addBlock(block) will store a block in the chain
   * @param {*} block
   * The method will return a Promise that will resolve with the block added
   * or reject if an error happen during the execution.
   * You will need to check for the height to assign the `previousBlockHash`,
   * assign the `timestamp` and the correct `height`...At the end you need to
   * create the `block hash` and push the block into the chain array. Don't for get
   * to update the `this.height`
   * Note: the symbol `_` in the method name indicates in the javascript convention
   * that this method is a private method.
   */
  async _addBlock(block) {
    return new Promise((resolve, reject) => {
      try {
        block.time = moment().unix();
        block.height = this.height === -1 ? 0 : this.height + 1;
        block.previousBlockHash =
          this.height !== -1 ? _.last(this.chain).hash : null;
        block.recalculateHash();

        this.chain.push(block);
        this.height += 1;

        resolve(block);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * The requestMessageOwnershipVerification(address) method
   * will allow you  to request a message that you will use to
   * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
   * This is the first step before submit your Block.
   * The method return a Promise that will resolve with the message to be signed
   * @param {*} address
   */
  requestMessageOwnershipVerification(address) {
    return new Promise(resolve => {
      const message = new StarOwnershipVerificationMessage(address);
      resolve(message.toString());
    });
  }

  /**
   * The submitStar(address, message, signature, star) method
   * will allow users to register a new Block with the star object
   * into the chain. This method will resolve with the Block added or
   * reject with an error.
   * Algorithm steps:
   * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
   * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
   * 3. Check if the time elapsed is less than 5 minutes
   * 4. Verify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
   * 5. Create the block and add it to the chain
   * 6. Resolve with the block added.
   * @param {*} address
   * @param {*} message
   * @param {*} signature
   * @param {*} star
   */
  submitStar(address, message, signature, star) {
    return new Promise((resolve, reject) => {
      try {
        const msg = StarOwnershipVerificationMessage.parse(message);

        if (msg.isOlderThan(MAX_OWNERSHIP_VERIFICATION_DURATION)) {
          reject(
            new Error(
              "Ownership verification message should not be older than 5 minutes."
            )
          );
        }

        if (!bitcoinMessage.verify(message, address, signature)) {
          reject(new Error("Failed to verify message with wallet."));
        }

        const block = this._addBlock(new Block({ star, address }));

        resolve(block);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block
   *  with the hash passed as a parameter.
   * Search on the chain array for the block that has the hash.
   * @param {*} hash
   */
  getBlockByHash(hash) {
    return new Promise((resolve, reject) => {
      try {
        resolve(this.chain.find(block => block.hash === hash));
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block object
   * with the height equal to the parameter `height`
   * @param {*} height
   */
  getBlockByHeight(height) {
    return new Promise((resolve, reject) => {
      try {
        const block = this.chain.find(item => item.height === height);
        if (block) {
          resolve(block);
        } else {
          resolve(null);
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
   * and are belongs to the owner with the wallet address passed as parameter.
   * Remember the star should be returned decoded.
   * @param {*} address
   */
  getStarsByWalletAddress(address) {
    return Promise.all(this.chain.map(block => block.getBData())).then(
      blockData => {
        return blockData
          .filter(data => data && data.address === address)
          .map(data => ({ star: data.star, owner: data.address }));
      }
    );
  }

  /**
   * This method will return a Promise that will resolve with the list of errors when validating the chain.
   * Steps to validate:
   * 1. You should validate each block using `validateBlock`
   * 2. Each Block should check the with the previousBlockHash
   */
  validateChain() {
    return Promise.all(this.chain.map(block => block.validate())).then(
      result => {
        const errorLog = [];

        let previousBlockHash;

        this.chain.forEach((block, idx) => {
          if (!result[idx]) {
            errorLog.push(`Invalid hash for block #${block.height}`);
          }

          if (
            !block.isGenesis &&
            block.previousBlockHash !== previousBlockHash
          ) {
            errorLog.push(
              `Invalid previous block hash for block #${block.height}`
            );
          }

          previousBlockHash = block.hash;
        });

        return errorLog;
      }
    );
  }
}

module.exports.Blockchain = Blockchain;
