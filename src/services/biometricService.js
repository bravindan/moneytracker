import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const CREDENTIALS_KEY = "moneytracker_credentials";

/**
 * Check if biometric hardware is available and enrolled.
 */
export const isBiometricAvailable = async () => {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
};

/**
 * Prompt for biometric authentication.
 */
export const authenticateWithBiometrics = async () => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Authenticate to sign in",
    cancelLabel: "Use password",
    disableDeviceFallback: false,
  });
  return result.success;
};

/**
 * Save login credentials securely.
 */
export const saveCredentials = async (email, password) => {
  await SecureStore.setItemAsync(
    CREDENTIALS_KEY,
    JSON.stringify({ email, password })
  );
};

/**
 * Get saved login credentials.
 */
export const getSavedCredentials = async () => {
  const data = await SecureStore.getItemAsync(CREDENTIALS_KEY);
  return data ? JSON.parse(data) : null;
};

/**
 * Clear saved credentials.
 */
export const clearCredentials = async () => {
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
};
