import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BiometricCapabilities {
  isAvailable: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  hasHardware: boolean;
  isEnrolled: boolean;
  securityLevel: LocalAuthentication.SecurityLevel;
}

export interface BiometricSettings {
  enabled: boolean;
  requireOnAppLaunch: boolean;
  requireOnSensitiveActions: boolean;
  fallbackToPasscode: boolean;
  autoLockTimeout: number; // minutes
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: LocalAuthentication.AuthenticationType;
  warning?: string;
}

class BiometricAuthService {
  private isInitialized: boolean = false;
  private capabilities: BiometricCapabilities | null = null;
  private settings: BiometricSettings | null = null;

  /**
   * Initialize biometric authentication service
   */
  async initialize(): Promise<void> {
    try {
      this.capabilities = await this.checkBiometricCapabilities();
      this.settings = await this.loadSettings();
      this.isInitialized = true;
      
      console.log('Biometric auth service initialized:', {
        available: this.capabilities.isAvailable,
        types: this.capabilities.supportedTypes,
        enabled: this.settings.enabled,
      });
    } catch (error) {
      console.error('Failed to initialize biometric auth service:', error);
      throw error;
    }
  }

  /**
   * Check device biometric capabilities
   */
  private async checkBiometricCapabilities(): Promise<BiometricCapabilities> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      const isAvailable = hasHardware && isEnrolled && supportedTypes.length > 0;

      return {
        isAvailable,
        supportedTypes,
        hasHardware,
        isEnrolled,
        securityLevel,
      };
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      return {
        isAvailable: false,
        supportedTypes: [],
        hasHardware: false,
        isEnrolled: false,
        securityLevel: LocalAuthentication.SecurityLevel.NONE,
      };
    }
  }

  /**
   * Load biometric settings from storage
   */
  private async loadSettings(): Promise<BiometricSettings> {
    try {
      const stored = await AsyncStorage.getItem('biometric_settings');
      if (stored) {
        return JSON.parse(stored);
      }

      // Default settings
      return {
        enabled: false,
        requireOnAppLaunch: false,
        requireOnSensitiveActions: false,
        fallbackToPasscode: true,
        autoLockTimeout: 5, // 5 minutes
      };
    } catch (error) {
      console.error('Error loading biometric settings:', error);
      return {
        enabled: false,
        requireOnAppLaunch: false,
        requireOnSensitiveActions: false,
        fallbackToPasscode: true,
        autoLockTimeout: 5,
      };
    }
  }

  /**
   * Save biometric settings to storage
   */
  private async saveSettings(settings: BiometricSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('biometric_settings', JSON.stringify(settings));
      this.settings = settings;
    } catch (error) {
      console.error('Error saving biometric settings:', error);
      throw error;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometricAuth(): Promise<BiometricAuthResult> {
    if (!this.isInitialized) {
      throw new Error('Biometric auth service not initialized');
    }

    if (!this.capabilities?.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    try {
      // Test biometric authentication
      const authResult = await this.authenticateWithBiometrics(
        'Enable biometric authentication for TaskQuest?',
        'This will allow you to quickly and securely access your account'
      );

      if (!authResult.success) {
        return authResult;
      }

      // Generate and store a biometric key
      const biometricKey = await this.generateBiometricKey();
      await this.storeBiometricKey(biometricKey);

      // Update settings
      await this.saveSettings({
        ...this.settings!,
        enabled: true,
      });

      return {
        success: true,
        biometricType: this.getPrimaryBiometricType(),
      };
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable biometric authentication',
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth(): Promise<void> {
    try {
      // Remove stored biometric key
      await SecureStore.deleteItemAsync('biometric_key');
      
      // Update settings
      await this.saveSettings({
        ...this.settings!,
        enabled: false,
        requireOnAppLaunch: false,
        requireOnSensitiveActions: false,
      });

      console.log('Biometric authentication disabled');
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticateWithBiometrics(
    promptMessage?: string,
    fallbackLabel?: string
  ): Promise<BiometricAuthResult> {
    if (!this.isInitialized) {
      throw new Error('Biometric auth service not initialized');
    }

    if (!this.capabilities?.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available',
      };
    }

    try {
      const biometricType = this.getPrimaryBiometricType();
      const typeLabel = this.getBiometricTypeLabel(biometricType);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || `Use ${typeLabel} to access TaskQuest`,
        fallbackLabel: fallbackLabel || (this.settings?.fallbackToPasscode ? 'Use Passcode' : undefined),
        disableDeviceFallback: !this.settings?.fallbackToPasscode,
        cancelLabel: 'Cancel',
        requireConfirmation: false,
      });

      if (result.success) {
        // Update last authentication time
        await AsyncStorage.setItem('last_biometric_auth', new Date().toISOString());
        
        return {
          success: true,
          biometricType,
        };
      } else {
        let error = 'Authentication failed';
        
        switch (result.error) {
          case 'UserCancel':
            error = 'Authentication was cancelled';
            break;
          case 'SystemCancel':
            error = 'Authentication was cancelled by the system';
            break;
          case 'UserFallback':
            error = 'User chose to use passcode instead';
            break;
          case 'BiometricUnavailable':
            error = 'Biometric authentication is currently unavailable';
            break;
          case 'DeviceCredentialsNotSet':
            error = 'No device credentials are set up';
            break;
          case 'BiometricNotEnrolled':
            error = 'No biometric credentials are enrolled';
            break;
          default:
            error = result.error || 'Authentication failed';
        }

        return {
          success: false,
          error,
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Check if biometric authentication is required
   */
  async isBiometricAuthRequired(): Promise<boolean> {
    if (!this.settings?.enabled) {
      return false;
    }

    if (!this.settings.requireOnAppLaunch) {
      return false;
    }

    // Check if auto-lock timeout has been exceeded
    try {
      const lastAuthTime = await AsyncStorage.getItem('last_biometric_auth');
      if (!lastAuthTime) {
        return true;
      }

      const lastAuth = new Date(lastAuthTime);
      const now = new Date();
      const minutesSinceAuth = (now.getTime() - lastAuth.getTime()) / (1000 * 60);

      return minutesSinceAuth >= this.settings.autoLockTimeout;
    } catch (error) {
      console.error('Error checking biometric auth requirement:', error);
      return true; // Err on the side of security
    }
  }

  /**
   * Update biometric settings
   */
  async updateSettings(updates: Partial<BiometricSettings>): Promise<void> {
    if (!this.settings) {
      throw new Error('Settings not loaded');
    }

    const newSettings = { ...this.settings, ...updates };
    await this.saveSettings(newSettings);
  }

  /**
   * Get current biometric capabilities
   */
  getBiometricCapabilities(): BiometricCapabilities | null {
    return this.capabilities;
  }

  /**
   * Get current biometric settings
   */
  getBiometricSettings(): BiometricSettings | null {
    return this.settings;
  }

  /**
   * Check if biometric authentication is enabled
   */
  isEnabled(): boolean {
    return this.settings?.enabled ?? false;
  }

  /**
   * Get primary biometric type available on device
   */
  private getPrimaryBiometricType(): LocalAuthentication.AuthenticationType | undefined {
    if (!this.capabilities?.supportedTypes.length) {
      return undefined;
    }

    // Prioritize Face ID/Face Recognition, then Touch ID/Fingerprint
    if (this.capabilities.supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION;
    }
    
    if (this.capabilities.supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return LocalAuthentication.AuthenticationType.FINGERPRINT;
    }

    return this.capabilities.supportedTypes[0];
  }

  /**
   * Get user-friendly label for biometric type
   */
  private getBiometricTypeLabel(type?: LocalAuthentication.AuthenticationType): string {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Iris Recognition';
      default:
        return 'Biometric Authentication';
    }
  }

  /**
   * Generate a secure key for biometric authentication
   */
  private async generateBiometricKey(): Promise<string> {
    // Generate a random key for additional security
    const key = Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');
    
    return key;
  }

  /**
   * Store biometric key securely
   */
  private async storeBiometricKey(key: string): Promise<void> {
    await SecureStore.setItemAsync('biometric_key', key, {
      requireAuthentication: true,
      authenticationPrompt: 'Authenticate to access your secure data',
    });
  }

  /**
   * Verify stored biometric key
   */
  async verifyBiometricKey(): Promise<boolean> {
    try {
      const storedKey = await SecureStore.getItemAsync('biometric_key', {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to verify your identity',
      });
      
      return storedKey !== null;
    } catch (error) {
      console.error('Error verifying biometric key:', error);
      return false;
    }
  }

  /**
   * Handle biometric enrollment changes
   */
  async handleEnrollmentChange(): Promise<void> {
    try {
      // Re-check capabilities
      this.capabilities = await this.checkBiometricCapabilities();
      
      // If biometrics are no longer available, disable the feature
      if (!this.capabilities.isAvailable && this.settings?.enabled) {
        await this.disableBiometricAuth();
        console.log('Biometric authentication disabled due to enrollment changes');
      }
    } catch (error) {
      console.error('Error handling enrollment change:', error);
    }
  }

  /**
   * Get biometric authentication statistics
   */
  async getAuthStats(): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    lastAuthTime: string | null;
    averageAuthTime: number;
  }> {
    try {
      const stored = await AsyncStorage.getItem('biometric_stats');
      if (stored) {
        return JSON.parse(stored);
      }

      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        lastAuthTime: null,
        averageAuthTime: 0,
      };
    } catch (error) {
      console.error('Error getting auth stats:', error);
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        lastAuthTime: null,
        averageAuthTime: 0,
      };
    }
  }

  /**
   * Track authentication attempt
   */
  async trackAuthAttempt(success: boolean, duration: number): Promise<void> {
    try {
      const stats = await this.getAuthStats();
      
      const updatedStats = {
        totalAttempts: stats.totalAttempts + 1,
        successfulAttempts: success ? stats.successfulAttempts + 1 : stats.successfulAttempts,
        failedAttempts: success ? stats.failedAttempts : stats.failedAttempts + 1,
        lastAuthTime: success ? new Date().toISOString() : stats.lastAuthTime,
        averageAuthTime: ((stats.averageAuthTime * stats.totalAttempts) + duration) / (stats.totalAttempts + 1),
      };

      await AsyncStorage.setItem('biometric_stats', JSON.stringify(updatedStats));
    } catch (error) {
      console.error('Error tracking auth attempt:', error);
    }
  }

  /**
   * Clean up service
   */
  destroy(): void {
    this.isInitialized = false;
    this.capabilities = null;
    this.settings = null;
  }
}

export const biometricAuthService = new BiometricAuthService();