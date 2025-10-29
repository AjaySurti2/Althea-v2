import React, { useState, useEffect } from 'react';
import { Users, Plus, X, AlertCircle, CheckCircle, Calendar, Heart, Loader2, Info, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFamilyMembers, createFamilyMember, CreateFamilyMemberInput } from '../lib/familyApi';
import { FamilyMember } from '../lib/supabase';

interface FamilyDetailsCaptureProps {
  darkMode: boolean;
  onContinue: (selectedMemberId: string | null) => void;
  onSkip: () => void;
}

const RELATIONSHIPS = [
  'Myself',
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Other'
];

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export const FamilyDetailsCapture: React.FC<FamilyDetailsCaptureProps> = ({
  darkMode,
  onContinue,
  onSkip
}) => {
  const { profile } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CreateFamilyMemberInput>({
    name: '',
    relationship: '',
    date_of_birth: null,
    gender: null,
    age: null,
    existing_conditions: [],
    allergies: [],
    medical_history_notes: null,
  });

  const [conditionInput, setConditionInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  const loadFamilyMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await getFamilyMembers();

      if (error) {
        setError(error.message);
        setMembers([]);
        return;
      }

      setMembers(data || []);

      if (!data || data.length === 0) {
        setShowAddForm(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load family members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCondition = () => {
    if (conditionInput.trim()) {
      setFormData({
        ...formData,
        existing_conditions: [...(formData.existing_conditions || []), conditionInput.trim()]
      });
      setConditionInput('');
    }
  };

  const handleRemoveCondition = (index: number) => {
    setFormData({
      ...formData,
      existing_conditions: formData.existing_conditions?.filter((_, i) => i !== index) || []
    });
  };

  const handleAddAllergy = () => {
    if (allergyInput.trim()) {
      setFormData({
        ...formData,
        allergies: [...(formData.allergies || []), allergyInput.trim()]
      });
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (index: number) => {
    setFormData({
      ...formData,
      allergies: formData.allergies?.filter((_, i) => i !== index) || []
    });
  };

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.relationship) {
      setError('Relationship is required');
      return;
    }

    setSaving(true);

    try {
      const memberData: CreateFamilyMemberInput = {
        ...formData,
        age: formData.date_of_birth ? calculateAge(formData.date_of_birth) : formData.age,
      };

      const { data: newMember, error: createError } = await createFamilyMember(memberData);

      if (createError || !newMember) {
        setError(createError?.message || 'Failed to add family member');
        return;
      }

      setMembers([...members, newMember]);
      setSelectedMemberId(newMember.id);
      setSuccess('Family member added successfully!');
      setShowAddForm(false);
      setFormData({
        name: '',
        relationship: '',
        date_of_birth: null,
        gender: null,
        age: null,
        existing_conditions: [],
        allergies: [],
        medical_history_notes: null,
      });
      setConditionInput('');
      setAllergyInput('');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add family member');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(selectedMemberId === memberId ? null : memberId);
  };

  const handleContinue = () => {
    if (members.length === 0) {
      setError('Please add at least one family member or skip to continue');
      return;
    }
    onContinue(selectedMemberId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-xl ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50'} border-2 ${
        darkMode ? 'border-emerald-800' : 'border-emerald-200'
      }`}>
        <div className="flex items-start gap-3">
          <Users className={`w-7 h-7 flex-shrink-0 mt-0.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <div className="flex-1">
            <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>
              Step 1: Associate Health Report with Family Member
            </h3>
            <p className={`text-sm mb-3 ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
              To provide the most accurate and personalized health insights, please select or add the family member this report belongs to.
            </p>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-emerald-950/50' : 'bg-white/80'}`}>
              <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>
                Benefits of linking to family members:
              </p>
              <ul className={`text-sm space-y-1 ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                <li>• <strong>Organized records</strong> - Keep each person's health data separate</li>
                <li>• <strong>Personalized insights</strong> - Age and gender-specific recommendations</li>
                <li>• <strong>Family patterns</strong> - Detect hereditary health risks</li>
                <li>• <strong>Trend tracking</strong> - Monitor health changes over time</li>
              </ul>
            </div>
            {members.length === 0 && (
              <p className={`text-sm mt-3 font-medium ${darkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>
                👇 Start by adding your first family member below
              </p>
            )}
            {members.length > 0 && (
              <p className={`text-sm mt-3 font-medium ${darkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>
                👇 Select a family member below or add a new one
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className={`p-4 rounded-lg border flex items-start space-x-3 ${
          darkMode ? 'bg-red-950/50 border-red-800' : 'bg-red-50 border-red-300'
        }`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
          <p className={`text-sm font-medium ${darkMode ? 'text-red-200' : 'text-red-900'}`}>{error}</p>
        </div>
      )}

      {success && (
        <div className={`p-4 rounded-lg border flex items-start space-x-3 ${
          darkMode ? 'bg-green-950/50 border-green-800' : 'bg-green-50 border-green-300'
        }`}>
          <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
          <p className={`text-sm font-medium ${darkMode ? 'text-green-200' : 'text-green-900'}`}>{success}</p>
        </div>
      )}

      {!showAddForm && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {members.length > 0 ? 'Select Family Member' : 'Add Your First Family Member'}
            </h3>
            {members.length > 0 && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Member
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <div className={`p-8 rounded-xl border-2 border-dashed text-center ${
              darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
            }`}>
              <Users className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                No Family Members Yet
              </h4>
              <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Add your first family member to start organizing health reports and tracking family health patterns.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Add First Member
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                onClick={() => handleSelectMember(member.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedMemberId === member.id
                    ? darkMode
                      ? 'border-emerald-500 bg-emerald-900/20'
                      : 'border-emerald-500 bg-emerald-50'
                    : darkMode
                    ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {member.name}
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {member.relationship}
                      {member.age && ` • ${member.age} years old`}
                    </p>
                    {member.gender && (
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {member.gender}
                      </p>
                    )}
                  </div>
                  {selectedMemberId === member.id && (
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  )}
                </div>

                {(member.existing_conditions && member.existing_conditions.length > 0) && (
                  <div className="mt-3">
                    <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Conditions:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {member.existing_conditions.map((condition, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-1 rounded ${
                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </div>
      )}

      {showAddForm && (
        <div className={`p-6 rounded-xl border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Add Family Member
            </h3>
            {members.length > 0 && (
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setError('');
                }}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                  placeholder="Enter name"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Relationship *
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                  required
                >
                  <option value="">Select relationship</option>
                  {RELATIONSHIPS.map(rel => (
                    <option key={rel} value={rel}>{rel}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value || null })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Gender
                </label>
                <select
                  value={formData.gender || ''}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value || null })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                >
                  <option value="">Select gender</option>
                  {GENDERS.map(gender => (
                    <option key={gender} value={gender}>{gender}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Medical Conditions (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCondition())}
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                  placeholder="e.g., Diabetes, Hypertension"
                />
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {formData.existing_conditions && formData.existing_conditions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.existing_conditions.map((condition, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${
                        darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {condition}
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(idx)}
                        className="hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Allergies (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllergy())}
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                  placeholder="e.g., Penicillin, Peanuts"
                />
                <button
                  type="button"
                  onClick={handleAddAllergy}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {formData.allergies && formData.allergies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.allergies.map((allergy, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${
                        darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(idx)}
                        className="hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Additional Medical History (Optional)
              </label>
              <textarea
                value={formData.medical_history_notes || ''}
                onChange={(e) => setFormData({ ...formData, medical_history_notes: e.target.value || null })}
                rows={3}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                placeholder="Any other relevant medical history..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Add Member
                  </>
                )}
              </button>
              {members.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setError('');
                  }}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    darkMode
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {!showAddForm && (
        <div className="space-y-4 pt-4">
          {selectedMemberId && members.length > 0 && (
            <div className={`p-4 rounded-lg border-2 ${
              darkMode ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-300'
            }`}>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>
                    Selected Family Member:
                  </p>
                  <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {members.find(m => m.id === selectedMemberId)?.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleContinue}
              disabled={members.length > 0 && !selectedMemberId}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                members.length > 0 && !selectedMemberId
                  ? darkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {members.length > 0 && !selectedMemberId ? (
                <>
                  Select a Member to Continue
                  <AlertCircle className="w-5 h-5" />
                </>
              ) : (
                <>
                  Continue to Upload
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <button
              onClick={onSkip}
              className={`px-6 py-3 rounded-lg font-medium border-2 ${
                darkMode
                  ? 'border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              Skip for Now
            </button>
          </div>

          {members.length > 0 && !selectedMemberId && (
            <p className={`text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              💡 Tip: Select a family member above to enable personalized health insights
            </p>
          )}
        </div>
      )}
    </div>
  );
};
