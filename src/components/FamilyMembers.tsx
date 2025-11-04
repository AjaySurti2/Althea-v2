import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, X, Calendar, Heart, AlertCircle } from 'lucide-react';
import {
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  CreateFamilyMemberInput
} from '../lib/familyApi';
import { FamilyMember } from '../lib/supabase';

const RELATIONSHIPS = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Uncle/Aunt',
  'Nephew/Niece',
  'Cousin',
  'Other'
];

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export default function FamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
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
    setError(null);
    const { data, error: err } = await getFamilyMembers();
    if (err) {
      setError(err.message);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.relationship) {
      setError('Name and relationship are required');
      return;
    }

    if (editingMember) {
      const { error: err } = await updateFamilyMember({
        id: editingMember.id,
        ...formData,
      });
      if (err) {
        setError(err.message);
        return;
      }
    } else {
      const { error: err } = await createFamilyMember(formData);
      if (err) {
        setError(err.message);
        return;
      }
    }

    resetForm();
    loadFamilyMembers();
  };

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      relationship: member.relationship,
      date_of_birth: member.date_of_birth,
      gender: member.gender,
      age: member.age,
      existing_conditions: member.existing_conditions || [],
      allergies: member.allergies || [],
      medical_history_notes: member.medical_history_notes,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this family member? This action cannot be undone.')) {
      return;
    }

    const { error: err } = await deleteFamilyMember(id);
    if (err) {
      setError(err.message);
    } else {
      loadFamilyMembers();
    }
  };

  const resetForm = () => {
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
    setEditingMember(null);
    setShowForm(false);
  };

  const addCondition = () => {
    if (conditionInput.trim() && !formData.existing_conditions?.includes(conditionInput.trim())) {
      setFormData({
        ...formData,
        existing_conditions: [...(formData.existing_conditions || []), conditionInput.trim()],
      });
      setConditionInput('');
    }
  };

  const removeCondition = (condition: string) => {
    setFormData({
      ...formData,
      existing_conditions: formData.existing_conditions?.filter(c => c !== condition) || [],
    });
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !formData.allergies?.includes(allergyInput.trim())) {
      setFormData({
        ...formData,
        allergies: [...(formData.allergies || []), allergyInput.trim()],
      });
      setAllergyInput('');
    }
  };

  const removeAllergy = (allergy: string) => {
    setFormData({
      ...formData,
      allergies: formData.allergies?.filter(a => a !== allergy) || [],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 pt-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading family members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl font-bold text-gray-900">Family Members</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Family Member
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingMember ? 'Edit Family Member' : 'Add Family Member'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter family member's name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship *
                  </label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select relationship</option>
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth || ''}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      value={formData.gender || ''}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select gender</option>
                      {GENDERS.map((gender) => (
                        <option key={gender} value={gender}>
                          {gender}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Existing Conditions
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={conditionInput}
                      onChange={(e) => setConditionInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Add a condition (e.g., Diabetes, Hypertension)"
                    />
                    <button
                      type="button"
                      onClick={addCondition}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.existing_conditions?.map((condition) => (
                      <span
                        key={condition}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm"
                      >
                        {condition}
                        <button
                          type="button"
                          onClick={() => removeCondition(condition)}
                          className="hover:text-emerald-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allergies
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={allergyInput}
                      onChange={(e) => setAllergyInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Add an allergy (e.g., Penicillin, Peanuts)"
                    />
                    <button
                      type="button"
                      onClick={addAllergy}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.allergies?.map((allergy) => (
                      <span
                        key={allergy}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                      >
                        {allergy}
                        <button
                          type="button"
                          onClick={() => removeAllergy(allergy)}
                          className="hover:text-red-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical History Notes
                  </label>
                  <textarea
                    value={formData.medical_history_notes || ''}
                    onChange={(e) => setFormData({ ...formData, medical_history_notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Add any relevant medical history information..."
                    maxLength={1000}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.medical_history_notes?.length || 0}/1000 characters
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >
                    {editingMember ? 'Update Member' : 'Add Member'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {members.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No family members yet</h3>
            <p className="text-gray-600 mb-6">Start by adding your first family member to track their health data.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Family Member
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => (
              <div key={member.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-500">{member.relationship}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(member)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {member.date_of_birth && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>Born: {new Date(member.date_of_birth).toLocaleDateString()}</span>
                    </div>
                  )}

                  {member.gender && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Gender:</span> {member.gender}
                    </div>
                  )}

                  {member.existing_conditions && member.existing_conditions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Heart className="w-4 h-4 text-emerald-600" />
                        Conditions
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {member.existing_conditions.map((condition) => (
                          <span
                            key={condition}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs"
                          >
                            {condition}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {member.allergies && member.allergies.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        Allergies
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {member.allergies.map((allergy) => (
                          <span
                            key={allergy}
                            className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs"
                          >
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
