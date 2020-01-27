class StartOwnershipVerificationMessage {
  static parse(message) {
    const parts = message.split(":");
    if (parts.length !== 3) {
      throw new Error(
        "Invalid format. Should be: <wallet address>:<timestamp>:starRegistry"
      );
    }

    return new StartOwnershipVerificationMessage(
      parts[0],
      moment.unix(parseInt(parts[1], 10))
    );
  }

  constructor(address, timestamp = moment()) {
    this.address = address;
    this.timestamp = timestamp;
  }

  toString() {
    return `${this.address}:${this.timestamp.unix()}:starRegistry`;
  }
}

module.exports.StartOwnershipVerificationMessage = StartOwnershipVerificationMessage;