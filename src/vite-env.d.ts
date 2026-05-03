/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

// Dev-only global log utilities
interface Window {
  __LOG?: {
    setFilter: (f: string) => void;
    getFilter: () => string;
    silence: () => void;
    all: () => void;
    viewer?: {
      show: () => void;
      hide: () => void;
      toggle: () => void;
      dump: () => unknown;
    };
  };
}
