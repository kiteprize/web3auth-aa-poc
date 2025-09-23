import { COUNTRY_CODES } from "../../../lib/phone/country-codes";
import type { IPhoneNumberValidator } from "../interfaces/IAuthService";

export class PhoneNumberService implements IPhoneNumberValidator {
  validate(countryCode: string, phoneNumber: string): boolean {
    const countryData = COUNTRY_CODES.find(country => country.code === countryCode);
    if (!countryData) return false;

    // 기본 전화번호 검증 로직
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    return cleanedNumber.length >= 8 && cleanedNumber.length <= 15;
  }

  format(countryCode: string, phoneNumber: string): string {
    const countryData = COUNTRY_CODES.find(country => country.code === countryCode);
    if (!countryData) throw new Error("Country not found");

    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    return `${countryData.dialCode}${cleanedNumber}`;
  }

  formatForWeb3Auth(countryData: any, phoneNumber: string): string {
    let cleanedNumber = phoneNumber.replace(/\D/g, '');

    // 국가별 전화번호 처리
    switch (countryData.code) {
      case 'KR':
        // 한국: 010-1234-5678 -> +82-10-1234-5678
        if (cleanedNumber.startsWith('010')) {
          cleanedNumber = cleanedNumber.substring(1); // 앞의 0 제거
        }
        break;

      case 'US':
      case 'CA':
        // 미국/캐나다: +1 형식은 그대로 사용
        break;

      case 'GB':
        // 영국: 0으로 시작하는 경우 제거
        if (cleanedNumber.startsWith('0')) {
          cleanedNumber = cleanedNumber.substring(1);
        }
        break;

      case 'JP':
        // 일본: 0으로 시작하는 경우 제거
        if (cleanedNumber.startsWith('0')) {
          cleanedNumber = cleanedNumber.substring(1);
        }
        break;

      default:
        // 기타 국가: 0으로 시작하면 제거 (일반적인 국제 표준)
        if (cleanedNumber.startsWith('0')) {
          cleanedNumber = cleanedNumber.substring(1);
        }
        break;
    }

    // Web3Auth가 요구하는 형식: +{cc}-{number}
    const formattedNumber = `${countryData.dialCode}-${cleanedNumber}`;

    // 디버깅을 위한 로그
    console.log(`📱 전화번호 변환: ${phoneNumber} -> ${formattedNumber} (국가: ${countryData.code})`);

    return formattedNumber;
  }
}