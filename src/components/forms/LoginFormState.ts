import { useState } from "react";
import { DEFAULT_COUNTRY } from "../../lib/phone/country-codes";

export interface LoginFormState {
  showDropdown: boolean;
  selectedCountry: string;
  phoneNumber: string;
  email: string;
}

export class LoginFormStateManager {
  private setState: React.Dispatch<React.SetStateAction<LoginFormState>>;
  private state: LoginFormState;

  constructor(
    state: LoginFormState,
    setState: React.Dispatch<React.SetStateAction<LoginFormState>>
  ) {
    this.state = state;
    this.setState = setState;
  }

  setShowDropdown(show: boolean): void {
    this.setState(prev => ({ ...prev, showDropdown: show }));
  }

  setSelectedCountry(country: string): void {
    this.setState(prev => ({ ...prev, selectedCountry: country }));
  }

  setPhoneNumber(phone: string): void {
    this.setState(prev => ({ ...prev, phoneNumber: phone }));
  }

  setEmail(email: string): void {
    this.setState(prev => ({ ...prev, email: email }));
  }

  resetForm(): void {
    this.setState({
      showDropdown: false,
      selectedCountry: DEFAULT_COUNTRY.code,
      phoneNumber: "",
      email: "",
    });
  }

  static useLoginFormState() {
    const [state, setState] = useState<LoginFormState>({
      showDropdown: false,
      selectedCountry: DEFAULT_COUNTRY.code,
      phoneNumber: "",
      email: "",
    });

    return new LoginFormStateManager(state, setState);
  }

  getState(): LoginFormState {
    return this.state;
  }
}