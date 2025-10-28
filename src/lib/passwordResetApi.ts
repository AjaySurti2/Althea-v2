import { supabase } from './supabase';

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  newPassword: string;
}

export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#reset-password`,
    });

    if (error) throw error;

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

export async function resetPassword(newPassword: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    await supabase.from('family_audit_log').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      family_member_id: null,
      action: 'update',
      entity_type: 'profile',
      entity_id: (await supabase.auth.getUser()).data.user?.id || '',
      changes_made: { password_reset: true },
    });

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

export async function verifyResetToken(): Promise<{ isValid: boolean; error: Error | null }> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (!session) {
      throw new Error('Invalid or expired reset token');
    }

    return { isValid: true, error: null };
  } catch (err) {
    return { isValid: false, error: err as Error };
  }
}
