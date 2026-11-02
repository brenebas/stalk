import { InstagramProfile, RealInstagramConnection } from '../types';
import {
  fetchInstagramProfile as fetchInstagramProfileBackend,
  fetchInstagramConnections as fetchInstagramConnectionsBackend,
  validateUsername,
  clearBackendCache,
  ApifyBackendError,
} from '../../api/lib/apifyBackendService';

export class ApifyError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'ApifyError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function clearApifyCache(): void {
  clearBackendCache();
}

export function sanitizeAndValidateUsername(rawUsername: string): string {
  const result = validateUsername(rawUsername);
  if (!result.valid) {
    throw new ApifyError(result.error || 'Nome de usuário inválido.', 400, 'INVALID_USERNAME');
  }
  return result.clean;
}

export async function fetchInstagramProfileApify(
  rawUsername: string,
  forceRefresh: boolean = false
): Promise<InstagramProfile> {
  try {
    const profile = await fetchInstagramProfileBackend(rawUsername, forceRefresh);
    return profile;
  } catch (error: any) {
    if (error instanceof ApifyBackendError) {
      throw new ApifyError(error.message, error.statusCode, error.code);
    }
    throw new ApifyError(error?.message || 'Erro ao consultar perfil na Apify', 500, 'INTERNAL_ERROR');
  }
}

export async function fetchInstagramConnectionsApify(
  rawUsername: string,
  forceRefresh: boolean = false
): Promise<RealInstagramConnection[]> {
  try {
    const result = await fetchInstagramConnectionsBackend(rawUsername, forceRefresh);
    return result.connections as RealInstagramConnection[];
  } catch (error: any) {
    if (error instanceof ApifyBackendError) {
      throw new ApifyError(error.message, error.statusCode, error.code);
    }
    return [];
  }
}
