"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTRY_CODES, DEFAULT_COUNTRY } from "@/lib/phone/country-codes";
import { PhoneNumberParser } from "@/lib/phone";
import {
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
  useWeb3AuthUser,
} from "@web3auth/modal/react";
import {
  Apple,
  ChevronDown,
  LogOut,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useState } from "react";

export default function LoginForm() {
  const { connectTo } = useWeb3AuthConnect();
  const { userInfo } = useWeb3AuthUser();
  const { disconnect } = useWeb3AuthDisconnect();

  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>(
    DEFAULT_COUNTRY.code
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  const handleSmsLogin = async () => {
    const countryData = COUNTRY_CODES.find(
      (country) => country.code === selectedCountry
    );
    if (!countryData) {
      console.error("Country not found");
      return;
    }

    const web3AuthFormattedNumber = PhoneNumberParser.formatForWeb3Auth(
      countryData,
      phoneNumber
    );
    await connectTo("auth", {
      authConnection: "sms_passwordless",
      loginHint: web3AuthFormattedNumber,
    });
    setShowDropdown(false);
  };

  const handleEmailLogin = async () => {
    await connectTo("auth", {
      authConnection: "email_passwordless",
      loginHint: email,
    });
    setShowDropdown(false);
  };

  const handleGoogleLogin = async () => {
    await connectTo("auth", {
      authConnection: "google",
    });
    setShowDropdown(false);
  };

  const handleAppleLogin = async () => {
    await connectTo("auth", {
      authConnection: "apple",
    });
    setShowDropdown(false);
  };

  const handleLogout = async () => {
    await disconnect();
    setShowDropdown(false);
  };

  const shortenUserId = (userId: string | undefined) => {
    if (!userId) return "";
    return userId.length > 20
      ? `${userId.slice(0, 8)}...${userId.slice(-8)}`
      : userId;
  };

  return (
    <div className='relative'>
      {userInfo ? (
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            onClick={() => setShowDropdown(!showDropdown)}
            className='flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-700'
          >
            <User className='w-4 h-4' />
            <span className='hidden sm:inline text-sm'>
              {shortenUserId(userInfo.userId)}
            </span>
            <ChevronDown className='w-3 h-3' />
          </Button>

          {showDropdown && (
            <div className='absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50'>
              <div className='p-4 space-y-3'>
                <div className='border-b border-gray-600 pb-3'>
                  <p className='text-sm font-medium text-gray-300'>
                    로그인된 사용자:
                  </p>
                  <p className='text-xs text-gray-400 break-all font-mono mt-1'>
                    {userInfo.userId}
                  </p>
                </div>
                <Button
                  onClick={handleLogout}
                  variant='destructive'
                  className='w-full flex items-center gap-2'
                  size='sm'
                >
                  <LogOut className='w-3 h-3' />
                  로그아웃
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className='flex items-center gap-2'>
          <Button
            variant='default'
            onClick={() => setShowDropdown(!showDropdown)}
            className='flex items-center gap-2 bg-blue-600 hover:bg-blue-700'
          >
            <User className='w-4 h-4' />
            <span className='hidden sm:inline'>로그인</span>
          </Button>

          {showDropdown && (
            <div className='absolute top-full right-0 mt-2 w-96 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50'>
              <div className='p-4 space-y-4'>
                <div className='text-center border-b border-gray-600 pb-4'>
                  <h3 className='text-lg font-semibold text-white'>로그인</h3>
                  <p className='text-sm text-gray-300 mt-1'>
                    계정에 로그인하려면 방법을 선택하세요
                  </p>
                </div>

                {/* Quick Social Login */}
                <div className='space-y-2'>
                  <Button
                    onClick={handleGoogleLogin}
                    variant='outline'
                    className='w-full border-gray-600 text-gray-300 hover:bg-gray-700'
                  >
                    <svg className='w-4 h-4 mr-2' viewBox='0 0 24 24'>
                      <path
                        fill='currentColor'
                        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                      />
                      <path
                        fill='currentColor'
                        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                      />
                      <path
                        fill='currentColor'
                        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                      />
                      <path
                        fill='currentColor'
                        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                      />
                    </svg>
                    Google로 계속하기
                  </Button>
                  <Button
                    onClick={handleAppleLogin}
                    variant='outline'
                    className='w-full border-gray-600 text-gray-300 hover:bg-gray-700'
                  >
                    <Apple className='w-4 h-4 mr-2' />
                    Apple로 계속하기
                  </Button>
                </div>

                {/* Divider */}
                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <span className='w-full border-t border-gray-600' />
                  </div>
                  <div className='relative flex justify-center text-xs uppercase'>
                    <span className='bg-gray-800 px-2 text-gray-400'>또는</span>
                  </div>
                </div>

                {/* SMS Login */}
                <div className='space-y-2'>
                  <Label htmlFor='phone' className='text-gray-300 text-sm'>
                    SMS로 로그인
                  </Label>
                  <div className='flex gap-2'>
                    <div className='flex flex-1 border border-gray-600 rounded-md overflow-hidden bg-gray-900'>
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className='bg-gray-800 border-none text-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                      >
                        {COUNTRY_CODES.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.dialCode}
                          </option>
                        ))}
                      </select>
                      <Input
                        id='phone'
                        type='tel'
                        placeholder='01012345678'
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className='flex-1 border-0 border-l border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 rounded-none focus:ring-0'
                      />
                    </div>
                    <Button
                      onClick={handleSmsLogin}
                      variant='outline'
                      size='sm'
                      className='border-gray-600 text-gray-300 hover:bg-gray-700 whitespace-nowrap'
                    >
                      <Phone className='w-4 h-4' />
                    </Button>
                  </div>
                </div>

                {/* Email Login */}
                <div className='space-y-2'>
                  <Label htmlFor='email' className='text-gray-300 text-sm'>
                    이메일로 로그인
                  </Label>
                  <div className='flex gap-2'>
                    <Input
                      id='email'
                      type='email'
                      placeholder='your@email.com'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className='bg-gray-900 border-gray-600 text-white placeholder:text-gray-500'
                    />
                    <Button
                      onClick={handleEmailLogin}
                      variant='outline'
                      size='sm'
                      className='border-gray-600 text-gray-300 hover:bg-gray-700 whitespace-nowrap'
                    >
                      <Mail className='w-4 h-4' />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showDropdown && (
        <div
          className='fixed inset-0 z-40'
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
