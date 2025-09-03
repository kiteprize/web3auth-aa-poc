import { CountryCode } from "./types";

export class PhoneNumberFormatter {
  static cleanPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/\D/g, "");
  }

  static formatKoreanNumber(nationalNumber: string): string {
    const clean = this.cleanPhoneNumber(nationalNumber);

    if (clean.length === 11 && clean.startsWith("010")) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`;
    }

    if (clean.length === 10 && clean.startsWith("02")) {
      return `${clean.slice(0, 2)}-${clean.slice(2, 6)}-${clean.slice(6)}`;
    }

    if (clean.length >= 10 && clean.length <= 11) {
      const areaCode = clean.slice(0, 3);
      const middle = clean.slice(3, clean.length - 4);
      const last = clean.slice(-4);
      return `${areaCode}-${middle}-${last}`;
    }

    return nationalNumber;
  }

  static formatUSNumber(nationalNumber: string): string {
    const clean = this.cleanPhoneNumber(nationalNumber);

    if (clean.length === 10) {
      return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
    }

    return nationalNumber;
  }

  static formatInternationalNumber(nationalNumber: string): string {
    const clean = this.cleanPhoneNumber(nationalNumber);

    // 기본적으로 4-4-4 또는 3-3-3-3 패턴으로 포맷팅
    if (clean.length <= 8) {
      return clean.replace(/(\d{4})(\d+)/, "$1-$2");
    }

    if (clean.length <= 12) {
      return clean.replace(/(\d{3})(\d{3})(\d+)/, "$1-$2-$3");
    }

    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, "$1-$2-$3-$4");
  }

  static formatByCountryCode(
    countryCode: string,
    nationalNumber: string
  ): string {
    switch (countryCode) {
      case "KR":
        return this.formatKoreanNumber(nationalNumber);
      case "US":
      case "CA":
        return this.formatUSNumber(nationalNumber);
      default:
        return this.formatInternationalNumber(nationalNumber);
    }
  }

  static formatForWeb3Auth(
    country: CountryCode,
    nationalNumber: string
  ): string {
    const cleanNumber = this.cleanPhoneNumber(nationalNumber);

    // Web3Auth SMS OTP 포맷: +{국가코드}{국내번호}
    // 한국의 경우 010 앞의 0 제거
    let formattedNational = cleanNumber;

    if (country.code === "KR" && cleanNumber.startsWith("010")) {
      formattedNational = cleanNumber.substring(1); // 맨 앞 0 제거
    } else if (country.code === "KR" && cleanNumber.startsWith("0")) {
      formattedNational = cleanNumber.substring(1); // 지역번호 앞 0 제거
    }

    return `${country.dialCode}-${formattedNational}`;
  }
}
