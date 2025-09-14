const crypto = require("crypto");

class PaytmChecksum {
  static iv = "@@@@&&&&####$$$$";

  static encrypt(input, key) {
    const cipher = crypto.createCipheriv("AES-128-CBC", key, PaytmChecksum.iv);
    let encrypted = cipher.update(input, "binary", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  }

  static decrypt(encrypted, key) {
    const decipher = crypto.createDecipheriv("AES-128-CBC", key, PaytmChecksum.iv);
    let decrypted = decipher.update(encrypted, "base64", "binary");
    try {
      decrypted += decipher.final("binary");
    } catch (e) {
      console.error("Decryption error:", e);
    }
    return decrypted;
  }

  static async generateSignature(params, key) {
    if (typeof params !== "object" && typeof params !== "string") {
      return Promise.reject(`Expected string or object, got ${typeof params}`);
    }

    if (typeof params !== "string") {
      params = PaytmChecksum.getStringByParams(params);
    }

    return PaytmChecksum.generateSignatureByString(params, key);
  }

  static async generateSignatureByString(params, key) {
    const salt = await PaytmChecksum.generateRandomString(4);
    return PaytmChecksum.calculateChecksum(params, key, salt);
  }

  static verifySignature(params, key, checksum) {
    if (typeof params !== "object" && typeof params !== "string") {
      return Promise.reject(`Expected string or object, got ${typeof params}`);
    }

    if (typeof params !== "string") {
      if (params.hasOwnProperty("CHECKSUMHASH")) {
        delete params.CHECKSUMHASH;
      }
      params = PaytmChecksum.getStringByParams(params);
    }

    return PaytmChecksum.verifySignatureByString(params, key, checksum);
  }

  static verifySignatureByString(params, key, checksum) {
    const paytmHash = PaytmChecksum.decrypt(checksum, key);
    const salt = paytmHash.slice(-4);
    return paytmHash === PaytmChecksum.calculateHash(params, salt);
  }

  static generateRandomString(length) {
    return new Promise((resolve, reject) => {
      crypto.randomBytes((length * 3) / 4, (err, buf) => {
        if (err) {
          console.error("Error generating random string:", err);
          return reject(err);
        }
        resolve(buf.toString("base64"));
      });
    });
  }

  static getStringByParams(params) {
    const data = {};
    Object.keys(params)
      .sort()
      .forEach((key) => {
        data[key] =
          params[key] !== null && params[key].toLowerCase() !== "null"
            ? params[key]
            : "";
      });
    return Object.values(data).join("|");
  }

  static calculateHash(params, salt) {
    const finalString = `${params}|${salt}`;
    return crypto.createHash("sha256").update(finalString).digest("hex") + salt;
  }

  static calculateChecksum(params, key, salt) {
    const hashString = PaytmChecksum.calculateHash(params, salt);
    return PaytmChecksum.encrypt(hashString, key);
  }
}

module.exports = PaytmChecksum;
