import type {
  AddressInput,
  NestedArray,
  NormalizedAddress,
  ParsedAddress,
  ParsedAddressEntry,
  ValidatedAddressList,
} from "@zone-eu/types";
import Headers = require("@zone-eu/mailsplit/lib/headers");
import type { RatioItem } from "../types";

export function validateAddress(headers: Headers, key: string): ValidatedAddressList;
export function convertAddresses(
  addresses: AddressInput[],
  withNames: true,
  addressList?: Map<string, ParsedAddress>
): Map<string, ParsedAddress>;
export function convertAddresses(
  addresses: AddressInput[],
  withNames?: false,
  addressList?: Map<string, string>
): Map<string, string>;
export function convertAddresses(
  addresses: AddressInput[],
  withNames?: boolean,
  addressList?: Map<string, NormalizedAddress>
): Map<string, NormalizedAddress>;
export function parseAddressList(
  headers: Headers,
  key: string,
  withNames: true
): ParsedAddress[];
export function parseAddressList(
  headers: Headers,
  key: string,
  withNames?: false
): string[];
export function parseAddressList(
  headers: Headers,
  key: string,
  withNames?: boolean
): NormalizedAddress[];
export function parseAddresses(
  headerList: AddressInput[],
  withNames: true
): ParsedAddress[];
export function parseAddresses(
  headerList: AddressInput[],
  withNames?: false
): string[];
export function parseAddresses(
  headerList: AddressInput[],
  withNames?: boolean
): NormalizedAddress[];
export function normalizeDomain(domain: string): string;
export function normalizeAddress(address: string | ParsedAddress, withNames: true): ParsedAddress | "";
export function normalizeAddress(address: string | ParsedAddress, withNames?: false): string;
export function flatten<T>(arr: NestedArray<T>[]): T[];
export function divideLoad<T extends RatioItem>(pool: T[]): T[];
