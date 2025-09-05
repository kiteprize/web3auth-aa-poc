import { COUNTRY_CODES } from "../../../lib/phone/country-codes";
import { PhoneNumberParser } from "../../../lib/phone";
import type { IPhoneNumberValidator } from "../interfaces/IAuthService";

export class PhoneNumberService implements IPhoneNumberValidator {
  validate(countryCode: string, phoneNumber: string): boolean {
    const countryData = COUNTRY_CODES.find(country => country.code === countryCode);
    if (!countryData) return false;
    
    return PhoneNumberParser.validatePhoneNumber(countryData, phoneNumber);
  }

  format(countryCode: string, phoneNumber: string): string {
    const countryData = COUNTRY_CODES.find(country => country.code === countryCode);
    if (!countryData) throw new Error("Country not found");
    
    return PhoneNumberParser.formatForWeb3Auth(countryData, phoneNumber);
  }

  formatForWeb3Auth(countryData: any, phoneNumber: string): string {
    return PhoneNumberParser.formatForWeb3Auth(countryData, phoneNumber);
  }
}