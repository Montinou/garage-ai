/**
 * Secret Manager Utility with Caching and TTL
 * Based on Google Cloud best practices for secure secret management
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleAuth } from 'google-auth-library';

// Cache for secrets with TTL
const secretCache = new Map<string, { value: string; timestamp: number }>();
const TTL_SECONDS = 300; // Cache for 5 minutes

let secretClient: SecretManagerServiceClient | null = null;

/**
 * Initialize Secret Manager client with proper authentication
 */
async function getSecretClient(): Promise<SecretManagerServiceClient> {
  if (secretClient) return secretClient;

  try {
    // Initialize with service account from environment variable
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const credentials = JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
      );
      
      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });

      secretClient = new SecretManagerServiceClient({ auth });
    } else {
      // Fallback to Application Default Credentials (for Cloud Run)
      secretClient = new SecretManagerServiceClient();
    }

    return secretClient;
  } catch (error) {
    console.error('Failed to initialize Secret Manager client:', error);
    throw new Error('Secret Manager client initialization failed');
  }
}

/**
 * Get a secret from Secret Manager with caching
 * @param secretName - Full resource name: projects/PROJECT_ID/secrets/SECRET_NAME/versions/latest
 * @returns The secret value as string
 */
export async function getSecret(secretName: string): Promise<string> {
  const now = Date.now();
  const cachedEntry = secretCache.get(secretName);

  // Return cached value if still valid
  if (cachedEntry && (now - cachedEntry.timestamp) / 1000 < TTL_SECONDS) {
    console.log(`[Cache HIT] Returning cached secret '${secretName.split('/').pop()}'`);
    return cachedEntry.value;
  }

  console.log(`[Cache MISS] Fetching secret '${secretName.split('/').pop()}' from Secret Manager`);
  
  try {
    const client = await getSecretClient();
    const [version] = await client.accessSecretVersion({ name: secretName });
    const secretValue = version.payload?.data?.toString('utf8');

    if (!secretValue) {
      throw new Error(`Secret '${secretName}' is empty or not found`);
    }

    // Cache the secret
    secretCache.set(secretName, { value: secretValue, timestamp: now });
    
    return secretValue;
  } catch (error) {
    console.error(`Failed to access secret '${secretName}':`, error);
    throw new Error(`Unable to retrieve secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the service account credentials from Secret Manager
 * @returns Parsed service account JSON credentials
 */
export async function getServiceAccountCredentials() {
  const projectId = 'analog-medium-451706-m7';
  const secretName = `projects/${projectId}/secrets/garage-ai-service-account/versions/latest`;
  
  const credentialsJson = await getSecret(secretName);
  return JSON.parse(credentialsJson);
}

/**
 * Clear the secret cache (useful for testing or forced refresh)
 */
export function clearSecretCache(): void {
  secretCache.clear();
  console.log('Secret cache cleared');
}