import { requireClient } from '../lib/supabase';
import { fail, ok, toServiceError, type Result } from '../lib/errors';
import type { Session, User } from '@supabase/supabase-js';

export const authService = {
  async signIn(email: string, password: string): Promise<Result<Session>> {
    try {
      const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
      if (error) return fail<Session>(error.message, error.status?.toString());
      if (!data.session) return fail<Session>('Sign-in did not return a session.');
      return ok(data.session);
    } catch (error) {
      return fail<Session>(toServiceError(error).message);
    }
  },

  async signOut(): Promise<Result<true>> {
    try {
      await requireClient().auth.signOut();
      return ok(true as const);
    } catch (error) {
      return fail<true>(toServiceError(error).message);
    }
  },

  async getSession(): Promise<Result<Session | null>> {
    try {
      const { data, error } = await requireClient().auth.getSession();
      if (error) return fail<Session | null>(error.message);
      return ok(data.session);
    } catch (error) {
      return fail<Session | null>(toServiceError(error).message);
    }
  },

  async getUser(): Promise<Result<User | null>> {
    try {
      const { data, error } = await requireClient().auth.getUser();
      if (error) return fail<User | null>(error.message);
      return ok(data.user);
    } catch (error) {
      return fail<User | null>(toServiceError(error).message);
    }
  },

  async requestPasswordReset(email: string): Promise<Result<true>> {
    try {
      const { error } = await requireClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}login`,
      });
      if (error) return fail<true>(error.message);
      return ok(true as const);
    } catch (error) {
      return fail<true>(toServiceError(error).message);
    }
  },

  async updatePassword(newPassword: string): Promise<Result<true>> {
    try {
      const { error } = await requireClient().auth.updateUser({ password: newPassword });
      if (error) return fail<true>(error.message);
      return ok(true as const);
    } catch (error) {
      return fail<true>(toServiceError(error).message);
    }
  },
};
