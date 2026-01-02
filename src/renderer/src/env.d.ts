/// <reference types="vite/client" />
import { API } from '../../shared/types';

declare global {
  interface Window {
    api: API;
  }
}
