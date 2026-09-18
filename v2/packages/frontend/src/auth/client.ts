import { createAuthClient } from 'better-auth/client';
import { API_BASE_URL } from '../env';

export const authClient = createAuthClient({ baseURL: API_BASE_URL });

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  emailVerified: boolean;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const { data } = await authClient.getSession();
  return (data?.user as AuthUser | undefined) ?? null;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await authClient.signIn.email({ email, password });

  if (error) {
    throw new Error(error.message ?? 'Sign in failed');
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string,
): Promise<void> {
  const { error } = await authClient.signUp.email({ email, password, name: name ?? email });

  if (error) {
    throw new Error(error.message ?? 'Sign up failed');
  }
}

export async function signOutUser(): Promise<void> {
  await authClient.signOut();
}
