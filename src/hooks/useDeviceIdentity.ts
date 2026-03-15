import { useEffect, useState } from 'react';

/**
 * Hook to get and maintain device identity for SCDA tracking
 * Generates a persistent device ID and retrieves client IP address
 */

// Generate a simple UUID-like string without external dependency
function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useDeviceIdentity() {
  const [deviceId, setDeviceId] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('unknown');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Generate or retrieve persistent device ID
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem('device_id', id);
    }
    setDeviceId(id);

    // Get IP address from free IP API
    const getIpAddress = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json', {
          cache: 'force-cache',
        });
        const data = await response.json();
        setIpAddress(data.ip || 'unknown');
      } catch (error) {
        console.warn('Could not retrieve IP address:', error);
        setIpAddress('unknown');
      } finally {
        setIsLoading(false);
      }
    };

    getIpAddress();
  }, []);

  return { deviceId, ipAddress, isLoading };
}
