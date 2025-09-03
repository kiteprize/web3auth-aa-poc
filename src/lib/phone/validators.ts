import { PhoneValidationResult } from './types'

export class PhoneNumberValidator {
  static validateKoreanNumber(nationalNumber: string): PhoneValidationResult {
    const cleanNumber = nationalNumber.replace(/\D/g, '')
    
    // 한국 전화번호: 010으로 시작하는 11자리 또는 02,031,032 등으로 시작하는 지역번호
    const mobilePattern = /^010\d{8}$/
    const landlinePattern = /^(02|0[3-6]\d)\d{7,8}$/
    
    if (mobilePattern.test(cleanNumber) || landlinePattern.test(cleanNumber)) {
      return { isValid: true }
    }
    
    return {
      isValid: false,
      errorMessage: '올바른 한국 전화번호 형식이 아닙니다.'
    }
  }
  
  static validateUSNumber(nationalNumber: string): PhoneValidationResult {
    const cleanNumber = nationalNumber.replace(/\D/g, '')
    
    // 미국 전화번호: 10자리 (area code + 7자리)
    const pattern = /^\d{10}$/
    
    if (pattern.test(cleanNumber)) {
      return { isValid: true }
    }
    
    return {
      isValid: false,
      errorMessage: 'Please enter a valid US phone number (10 digits).'
    }
  }
  
  static validateInternationalNumber(nationalNumber: string): PhoneValidationResult {
    const cleanNumber = nationalNumber.replace(/\D/g, '')
    
    // 국제 전화번호: 최소 7자리, 최대 15자리
    if (cleanNumber.length >= 7 && cleanNumber.length <= 15) {
      return { isValid: true }
    }
    
    return {
      isValid: false,
      errorMessage: 'Phone number must be between 7 and 15 digits.'
    }
  }
  
  static validateByCountryCode(countryCode: string, nationalNumber: string): PhoneValidationResult {
    switch (countryCode) {
      case 'KR':
        return this.validateKoreanNumber(nationalNumber)
      case 'US':
      case 'CA':
        return this.validateUSNumber(nationalNumber)
      default:
        return this.validateInternationalNumber(nationalNumber)
    }
  }
}