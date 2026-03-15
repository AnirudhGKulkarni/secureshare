import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook to get and maintain device identity for SCDA tracking
 * Generates a persistent device ID and retrieves client IP address
 */
export function useDeviceIdentity() {
  const [deviceId, setDeviceId] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('unknown');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Generate or retrieve persistent device ID
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = uuidv4();
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
