import { supabase, FamilyMember } from './supabase';
import { getCurrentUser } from './auth-utils';

export interface CreateFamilyMemberInput {
  name: string;
  relationship: string;
  date_of_birth?: string | null;
  gender?: string | null;
  age?: number | null;
  existing_conditions?: string[];
  allergies?: string[];
  medical_history_notes?: string | null;
}

export interface UpdateFamilyMemberInput extends Partial<CreateFamilyMemberInput> {
  id: string;
}

export interface FamilyHealthTrend {
  id: string;
  user_id: string;
  family_member_id: string | null;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  recorded_date: string;
  source_session_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface FamilyPatternAnalysis {
  pattern_type: string;
  affected_members: string[];
  risk_level: 'low' | 'moderate' | 'high';
  description: string;
  member_details: Array<{
    member_id: string;
    member_name: string;
    relationship: string;
    conditions: string[];
  }>;
}

async function logAudit(
  action: 'create' | 'update' | 'delete' | 'view',
  entityType: 'family_member' | 'session' | 'health_data' | 'profile',
  entityId: string,
  familyMemberId: string | null = null,
  changes: Record<string, unknown> = {}
) {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase.from('family_audit_log').insert({
    user_id: user.id,
    family_member_id: familyMemberId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes_made: changes,
  });
}

export async function createFamilyMember(input: CreateFamilyMemberInput): Promise<{ data: FamilyMember | null; error: Error | null }> {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('family_members')
      .insert({
        user_id: user.id,
        name: input.name,
        relationship: input.relationship,
        date_of_birth: input.date_of_birth || null,
        gender: input.gender || null,
        age: input.age || null,
        existing_conditions: input.existing_conditions || [],
        allergies: input.allergies || [],
        medical_history_notes: input.medical_history_notes || null,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    await logAudit('create', 'family_member', data.id, data.id, { name: input.name, relationship: input.relationship });

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function getFamilyMembers(): Promise<{ data: FamilyMember[] | null; error: Error | null }> {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function getFamilyMemberById(id: string): Promise<{ data: FamilyMember | null; error: Error | null }> {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    await logAudit('view', 'family_member', id, id);

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function updateFamilyMember(input: UpdateFamilyMemberInput): Promise<{ data: FamilyMember | null; error: Error | null }> {
  try {
    const user = await getCurrentUser();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.relationship !== undefined) updateData.relationship = input.relationship;
    if (input.date_of_birth !== undefined) updateData.date_of_birth = input.date_of_birth;
    if (input.gender !== undefined) updateData.gender = input.gender;
    if (input.age !== undefined) updateData.age = input.age;
    if (input.existing_conditions !== undefined) updateData.existing_conditions = input.existing_conditions;
    if (input.allergies !== undefined) updateData.allergies = input.allergies;
    if (input.medical_history_notes !== undefined) updateData.medical_history_notes = input.medical_history_notes;

    const { data, error } = await supabase
      .from('family_members')
      .update(updateData)
      .eq('id', input.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    await logAudit('update', 'family_member', input.id, input.id, updateData);

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function deleteFamilyMember(id: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const user = await getCurrentUser();

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    await logAudit('delete', 'family_member', id, id);

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

export async function getHealthTrends(memberId: string | null = null): Promise<{ data: FamilyHealthTrend[] | null; error: Error | null }> {
  try {
    const user = await getCurrentUser();

    let query = supabase
      .from('family_health_trends')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_date', { ascending: false });

    if (memberId !== null) {
      query = query.eq('family_member_id', memberId);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function analyzeFamilyPatterns(): Promise<{ data: FamilyPatternAnalysis[] | null; error: Error | null }> {
  try {
    const user = await getCurrentUser();

    const { data: familyMembers, error: membersError } = await supabase
      .from('family_members')
      .select('id, name, relationship, existing_conditions')
      .eq('user_id', user.id);

    if (membersError || !familyMembers) {
      return { data: null, error: new Error(membersError?.message || 'Failed to fetch family members') };
    }

    const conditionMap = new Map<string, Array<{ member_id: string; member_name: string; relationship: string }>>();

    familyMembers.forEach(member => {
      if (member.existing_conditions && Array.isArray(member.existing_conditions)) {
        member.existing_conditions.forEach((condition: string) => {
          if (!conditionMap.has(condition)) {
            conditionMap.set(condition, []);
          }
          conditionMap.get(condition)!.push({
            member_id: member.id,
            member_name: member.name,
            relationship: member.relationship,
          });
        });
      }
    });

    const patterns: FamilyPatternAnalysis[] = [];

    conditionMap.forEach((members, condition) => {
      if (members.length >= 2) {
        const risk_level = members.length >= 3 ? 'high' : members.length === 2 ? 'moderate' : 'low';

        patterns.push({
          pattern_type: condition,
          affected_members: members.map(m => m.member_id),
          risk_level,
          description: `${condition} detected in ${members.length} family member${members.length > 1 ? 's' : ''}: ${members.map(m => m.member_name).join(', ')}`,
          member_details: members.map(m => ({
            member_id: m.member_id,
            member_name: m.member_name,
            relationship: m.relationship,
            conditions: familyMembers.find(fm => fm.id === m.member_id)?.existing_conditions || [],
          })),
        });
      }
    });

    const { error: patternError } = await supabase.from('family_patterns').upsert(
      patterns.map(p => ({
        user_id: user.id,
        pattern_type: p.pattern_type,
        affected_members: p.affected_members,
        risk_level: p.risk_level,
        description: p.description,
      })),
      { onConflict: 'user_id,pattern_type' }
    );

    if (patternError) {
      console.error('Failed to save patterns:', patternError);
    }

    return { data: patterns, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
