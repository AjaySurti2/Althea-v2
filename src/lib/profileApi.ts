import { supabase, Profile } from './supabase';

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

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

    await supabase.from('family_audit_log').insert({
      user_id: user.id,
      family_member_id: null,
      action: 'update',
      entity_type: 'profile',
      entity_id: user.id,
      changes_made: updateData,
    });

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function getProfile(): Promise<{ data: Profile | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return { success: false, error: new Error('User not authenticated') };
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

    await supabase.from('family_audit_log').insert({
      user_id: user.id,
      family_member_id: null,
      action: 'update',
      entity_type: 'profile',
      entity_id: user.id,
      changes_made: { password_changed: true },
    });

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}
