import { supabase, Profile } from './supabase';
import { getCurrentUser } from './auth-utils';

export interface UpdateProfileInput {
  full_name?: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function updateProfile(input: UpdateProfileInput): Promise<{ data: Profile | null; error: Error | null }> {
  try {
    const user = await getCurrentUser();

    const updateData: Record<string, unknown> = {};
    if (input.full_name !== undefined) updateData.full_name = input.full_name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.date_of_birth !== undefined) updateData.date_of_birth = input.date_of_birth;
    if (input.gender !== undefined) updateData.gender = input.gender;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url;
    if (input.bio !== undefined) updateData.bio = input.bio;

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function getProfile(): Promise<{ data: Profile | null; error: Error | null }> {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function changePassword(input: ChangePasswordInput): Promise<{ success: boolean; error: Error | null }> {
  try {
    const user = await getCurrentUser();
    if (!user.email) {
      return { success: false, error: new Error('User email not found') };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: input.currentPassword,
    });

    if (signInError) {
      return { success: false, error: new Error('Current password is incorrect') };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: input.newPassword,
    });

    if (updateError) {
      return { success: false, error: new Error(updateError.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}
