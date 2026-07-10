const defaultApiUrl = "http://localhost:5001/api";
const defaultSocketUrl = "ws://localhost:5001/ws";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl;
export const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ?? defaultSocketUrl;
