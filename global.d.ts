declare module "*.css";

interface Window {
  __intl__?: {
    lang: string;
    show: () => void;
    hide: () => void;
    translatePage: () => Promise<void>;
  };
}
