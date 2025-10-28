import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Users, Activity } from 'lucide-react';
import { analyzeFamilyPatterns, FamilyPatternAnalysis } from '../lib/familyApi';

export default function FamilyPatterns() {
  const [patterns, setPatterns] = useState<FamilyPatternAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await analyzeFamilyPatterns();
    if (err) {
      setError(err.message);
    } else {
      setPatterns(data || []);
    }
    setLoading(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'moderate':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-green-700 bg-green-100 border-green-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'moderate':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <Activity className="w-5 h-5 text-green-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing family health patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <TrendingUp className="w-8 h-8 text-emerald-600" />
        <h2 className="text-3xl font-bold text-gray-900">Family Health Patterns</h2>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p>{error}</p>
        </div>
      )}

      {patterns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No patterns detected yet</h3>
          <p className="text-gray-600">
            Add health conditions to your family members to identify shared health patterns and hereditary risks.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pattern Detection Summary</h3>
            <p className="text-gray-700">
              We've identified <strong>{patterns.length}</strong> shared health pattern{patterns.length !== 1 ? 's' : ''} across your family members.
              Understanding these patterns can help you and your healthcare provider make informed decisions about preventive care.
            </p>
          </div>

          {patterns.map((pattern, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className={`px-6 py-4 border-l-4 ${
                pattern.risk_level === 'high'
                  ? 'border-red-500 bg-red-50'
                  : pattern.risk_level === 'moderate'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-green-500 bg-green-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRiskIcon(pattern.risk_level)}
                    <h3 className="text-xl font-semibold text-gray-900">{pattern.pattern_type}</h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(
                      pattern.risk_level
                    )}`}
                  >
                    {pattern.risk_level.toUpperCase()} RISK
                  </span>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-6">{pattern.description}</p>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Affected Family Members:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pattern.member_details.map((member) => (
                      <div
                        key={member.member_id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                            {member.member_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.member_name}</p>
                            <p className="text-sm text-gray-500">{member.relationship}</p>
                          </div>
                        </div>
                        {member.conditions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {member.conditions.map((condition) => (
                              <span
                                key={condition}
                                className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                              >
                                {condition}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Recommendation:</strong> Discuss this pattern with your healthcare provider.
                    Family history is an important factor in preventive care and early detection strategies.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
