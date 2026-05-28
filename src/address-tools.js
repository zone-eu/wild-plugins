//@ts-check
"use strict";

let addressparser = require("nodemailer/lib/addressparser");
let punycode = require("punycode.js");
let libmime = require("libmime");

/**
 * @typedef {import("../types").AddressInput} AddressInput
 * @typedef {import("../types").AnyRecord} AnyRecord
 * @typedef {import("@zone-eu/mailsplit/lib/headers")} Headers
 * @typedef {import("../types").NormalizedAddress} NormalizedAddress
 * @typedef {import("../types").ParsedAddress} ParsedAddress
 * @typedef {import("../types").ParsedAddressEntry} ParsedAddressEntry
 * @typedef {import("../types").ParsedAddressGroup} ParsedAddressGroup
 * @typedef {import("../types").ValidatedAddressList} ValidatedAddressList
 * @typedef {import("../types").RatioItem} RatioItem
 */

module.exports = {
  convertAddresses,
  parseAddressList,
  parseAddresses,
  normalizeDomain,
  normalizeAddress,
  flatten,
  validateAddress,
  divideLoad,
};

/**
 * @param {Headers} headers
 * @param {string} key
 * @returns {ValidatedAddressList}
 */
function validateAddress(headers, key) {
  let addressList = /** @type {ParsedAddress[]} */ (
    parseAddressList(headers, key, true)
  );
  addressList.forEach((address) => {
    try {
      address.name = libmime.decodeWords(address.name || "");
    } catch {
      // most probably an unknown charset was used, so keep as is
    }
  });
  return {
    /** @type {ParsedAddress[]} */
    addresses: addressList,
    /**
     * @param {...AddressInput} addresses
     */
    set() {
      let address = flatten([...arguments]);
      /** @type {string[]} */
      let values = [];
      /** @type {ParsedAddress[]} */ (
        parseAddresses(address || [], true)
      ).forEach((parsed) => {
        if (!parsed || !parsed.address) {
          return;
        }

        parsed.name = parsed.name || "";

        if (!/^[\w ']*$/.test(parsed.name)) {
          // check if contains only letters and numbers and such
          if (/^[\x20-\x7e]*$/.test(parsed.name)) {
            // check if only contains ascii characters
            parsed.name = '"' + parsed.name.replace(/([\\"])/g, "\\$1") + '"';
          } else {
            // requires mime encoding
            parsed.name = libmime.encodeWord(parsed.name, "Q", 52);
          }
        }

        values.push(
          parsed.name
            ? parsed.name + " <" + parsed.address + ">"
            : parsed.address,
        );
      });

      if (values.length) {
        headers.update(key, values.join(", "));
      } else {
        headers.remove(key);
      }
    },
  };
}

/**
 * @param {AddressInput[] | ParsedAddressEntry[]} addresses
 * @param {boolean} [withNames]
 * @param {Map<string, NormalizedAddress>} [addressList]
 * @returns {Map<string, NormalizedAddress>}
 */
function convertAddresses(addresses, withNames, addressList) {
  addressList = addressList || new Map();

  flatten(addresses || []).forEach((address) => {
    if (
      address &&
      typeof address === "object" &&
      "address" in address &&
      address.address
    ) {
      let normalized = withNames
        ? normalizeAddress(address, true)
        : normalizeAddress(address);
      let key =
        typeof normalized === "string" ? normalized : normalized.address;
      addressList.set(key, normalized);
    } else if (address && typeof address === "object" && "group" in address) {
      convertAddresses(address.group, withNames, addressList);
    }
  });

  return addressList;
}

/**
 * @param {Headers} headers
 * @param {string} key
 * @param {boolean} [withNames]
 * @returns {NormalizedAddress[]}
 */
function parseAddressList(headers, key, withNames) {
  return parseAddresses(
    headers.getDecoded(key).map((header) => header.value),
    withNames,
  );
}

/**
 * @param {Array<string | ParsedAddressEntry[]>} headerList
 * @param {boolean} [withNames]
 * @returns {NormalizedAddress[]}
 */
function parseAddresses(headerList, withNames) {
  let map = convertAddresses(
    headerList.map((address) => {
      if (typeof address === "string") {
        address = addressparser(address);
      }
      return address;
    }),
    withNames,
  );
  return Array.from(map).map((entry) => entry[1]);
}

/**
 * @param {string} domain
 * @returns {string}
 */
function normalizeDomain(domain) {
  return punycode.toASCII(domain.toLowerCase().trim());
}

/**
 * @overload
 * @param {string | ParsedAddress} address
 * @param {true} withNames
 * @returns {ParsedAddress | ""}
 */
/**
 * @overload
 * @param {string | ParsedAddress} address
 * @param {false} [withNames]
 * @returns {string}
 */
/**
 * @param {string | ParsedAddress} address
 * @param {boolean} [withNames]
 * @returns {NormalizedAddress | ""}
 */
function normalizeAddress(address, withNames) {
  if (typeof address === "string") {
    address = {
      address,
      name: "",
    };
  }
  if (!address || !address.address) {
    return "";
  }
  let user = address.address.substr(0, address.address.lastIndexOf("@"));
  let domain = address.address.substr(address.address.lastIndexOf("@") + 1);
  let addr = user.trim() + "@" + normalizeDomain(domain);

  if (withNames) {
    return {
      name: address.name || "",
      address: addr,
    };
  }

  return addr;
}

// helper function to flatten arrays
/**
 * @template T
 * @param {Array<T | T[]>} arr
 * @returns {T[]}
 */
function flatten(arr) {
  let flat = /** @type {Array<T | T[]>} */ (
    [].concat(.../** @type {any[]} */ (arr))
  );
  return /** @type {T[]} */ (flat.some(Array.isArray) ? flatten(flat) : flat);
}

/**
 * @template {RatioItem} T
 * @param {T[]} pool
 * @returns {T[]}
 */
function divideLoad(pool) {
  // handle warmup settings
  let customShares = 0;
  let customShareRatio = 0;

  pool = pool.map((item) => {
    /** @type {T} */
    let copy = {};
    Object.keys(item || {}).forEach((key) => {
      /** @type {AnyRecord} */ (copy)[key] = item[key];
    });

    if (copy.ratio) {
      copy.ratio = Math.min(Math.max(copy.ratio, 0), 1);
      customShareRatio += copy.ratio;
      customShares++;
    }

    return copy;
  });

  let totalShares = 0;
  let smallestShare = Infinity;
  if (pool.length > customShares) {
    let shareable = 1 - Math.min(customShareRatio, 1);
    let defaultShare = shareable / (pool.length - customShares);
    pool.forEach((item) => {
      if (!item.ratio) {
        item.ratio = defaultShare;
      }
      if (item.ratio) {
        if (item.ratio < smallestShare) {
          smallestShare = item.ratio;
        }
        totalShares += item.ratio;
      }
    });
  }

  let totalItems = Math.ceil(totalShares / smallestShare);

  /** @type {T[]} */
  let result = [];
  pool.forEach((item) => {
    if (!item || !item.ratio) {
      return;
    }
    let copies = Math.ceil(totalItems * item.ratio);
    if (copies) {
      for (let i = 0; i < copies; i++) {
        result.push(item);
      }
    }
  });

  return result;
}
