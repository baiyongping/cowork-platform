import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { db } from '../lib/cloudbase';

interface OutcomeGoal {
  _id: string;
  year: number;
  content: string;
  owner: string;
  ownerId: string;
  progress: number;
}

interface OutcomeGoalSelectorProps {
  onClose: () => void;
  onSelect: (goal: { id: string; content: string }) => void;
  selectedGoalId?: string;
}

export default function OutcomeGoalSelector({ onClose, onSelect, selectedGoalId }: OutcomeGoalSelectorProps) {
  const [goals, setGoals] = useState<OutcomeGoal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<OutcomeGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadOutcomeGoals();
  }, []);

  useEffect(() => {
    if (searchKeyword.trim()) {
      const filtered = goals.filter(goal =>
        goal.content.toLowerCase().includes(searchKeyword.toLowerCase())
      );
      setFilteredGoals(filtered);
    } else {
      setFilteredGoals(goals);
    }
  }, [searchKeyword, goals]);

  const loadOutcomeGoals = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      
      // 查询当前年度的成果目标
      const result = await db.collection('outcome_goals')
        .where({ year: currentYear })
        .orderBy('createdAt', 'desc')
        .get();

      if (result.code) {
        console.error('查询成果目标失败:', result.code, result.message);
        setGoals([]);
        return;
      }

      const data = Array.isArray(result.data) ? result.data : [];
      setGoals(data);
      setFilteredGoals(data);
    } catch (error) {
      console.error('加载成果目标失败:', error);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (goal: OutcomeGoal) => {
    onSelect({
      id: goal._id,
      content: goal.content
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">选择成果目标</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索成果目标内容..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 成果目标列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          )}

          {!loading && filteredGoals.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchKeyword ? '没有找到匹配的成果目标' : '暂无成果目标'}
            </div>
          )}

          {!loading && filteredGoals.length > 0 && (
            <div className="space-y-2">
              {filteredGoals.map((goal) => (
                <div
                  key={goal._id}
                  onClick={() => handleSelect(goal)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedGoalId === goal._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {goal.content}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{goal.year}年</span>
                        <span>完成度: {goal.progress}%</span>
                      </div>
                    </div>
                    {selectedGoalId === goal._id && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
