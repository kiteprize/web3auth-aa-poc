export interface CountryCode {
  code: string
  dialCode: string
  name: string
  flag: string
}

export interface PhoneNumberParseResult {
  countryCode: string
  nationalNumber: string
  formattedNumber: string
  isValid: boolean
}

export interface PhoneValidationResult {
  isValid: boolean
  errorMessage?: string
}