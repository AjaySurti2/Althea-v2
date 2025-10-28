import React, { useState, useEffect } from 'react';
import { Users, Plus, X, AlertCircle, CheckCircle, Calendar, Heart, Loader2, Info } from 'lucide-react';
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
      const data = await getFamilyMembers();
      setMembers(data);

      if (data.length === 0) {
        setShowAddForm(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load family members');
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

      const newMember = await createFamilyMember(memberData);
      setMembers([...members, newMember]);
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
      <div className={`p-6 rounded-xl ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border ${
        darkMode ? 'border-blue-800' : 'border-blue-200'
      }`}>
        <div className="flex items-start gap-3">
          <Info className={`w-6 h-6 flex-shrink-0 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <h3 className={`font-semibold mb-2 ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
              Why Family Details Matter
            </h3>
            <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
              Adding family member information helps us:
            </p>
            <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
              <li>• Organize health records by family member</li>
              <li>• Identify hereditary health patterns and genetic risks</li>
              <li>• Provide personalized insights based on age and medical history</li>
              <li>• Track family health trends over time</li>
            </ul>
            <p className={`text-sm mt-3 font-medium ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
              You can add members now or skip and organize later.
            </p>
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

      {members.length > 0 && !showAddForm && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Select Family Member (Optional)
            </h3>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </button>
          </div>

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
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleContinue}
            className="flex-1 py-3 px-6 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
          >
            Continue with {selectedMemberId ? 'Selected Member' : 'Upload'}
            <CheckCircle className="w-5 h-5" />
          </button>
          <button
            onClick={onSkip}
            className={`px-6 py-3 rounded-lg font-medium ${
              darkMode
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Skip for Now
          </button>
        </div>
      )}
    </div>
  );
};
