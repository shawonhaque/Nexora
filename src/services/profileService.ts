import { requireClient } from './base';
import { run } from './base';
import type { Result } from '../lib/errors';
import type { AppRole, ProfileRow } from '../lib/database.types';

export const profileService = {
  /**
   * Reads the signed-in user's role from the profiles table.
   * This is the only trusted source of the admin flag on the client; the same
   * value is enforced again by RLS for every write.
   */
  async getMyRole(userId: string): Promise<Result<AppRole>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data?.role ?? 'user') as AppRole;
    });
  },

  async getProfile(userId: string): Promise<Result<ProfileRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    });
  },

  /**
   * Updates display fields only. `role` is deliberately excluded so an admin
   * can never change their own role through a profile form.
   */
  async updateProfile(
    userId: string,
    patch: { display_name?: string | null; avatar_url?: string | null }
  ): Promise<Result<ProfileRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('profiles')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    });
  },
};
