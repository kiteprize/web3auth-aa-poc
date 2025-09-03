import { PhoneNumberParseResult, CountryCode } from './types'
import { PhoneNumberFormatter } from './formatters'
import { PhoneNumberValidator } from './validators'

export class PhoneNumberParser {
  static parsePhoneNumber(
    country: CountryCode,
    nationalNumber: string
  ): PhoneNumberParseResult {
    const cleanNumber = PhoneNumberFormatter.cleanPhoneNumber(nationalNumber)
    const validation = PhoneNumberValidator.validateByCountryCode(country.code, cleanNumber)
    
    return {
      countryCode: country.code,
      nationalNumber: cleanNumber,
      formattedNumber: PhoneNumberFormatter.formatByCountryCode(country.code, cleanNumber),
      isValid: validation.isValid
    }
  }
  
  static formatForWeb3Auth(country: CountryCode, nationalNumber: string): string {
    return PhoneNumberFormatter.formatForWeb3Auth(country, nationalNumber)
  }
  
  static validatePhoneNumber(country: CountryCode, nationalNumber: string): boolean {
    const validation = PhoneNumberValidator.validateByCountryCode(country.code, nationalNumber)
    return validation.isValid
  }
}