import { Users, Calendar, AlertCircle, CheckCircle, Circle, TrendingUp, Clock } from 'lucide-react';
import { Issue, getStatusColor, getStatusText, getResultColor, getPriorityColor, getUrgencyColor, getSolutionColor } from '../types/issue';

interface IssueCardProps {
  issue: Issue;
  onView: (issue: Issue) => void;
}

const StatusIcon = ({ status }: { status: string }) => {
  const iconClass = "w-4 h-4";
  switch(status) {
    case '待接收': return <Clock className={iconClass} />;
    case '处理中': return <TrendingUp className={iconClass} />;
    case '已处理': return <CheckCircle className={iconClass} />;
    case '待确认': return <AlertCircle className={iconClass} />;
    case '已确认': return <CheckCircle className={iconClass} />;
    default: return <Circle className={iconClass} />;
  }
};

export default function IssueCard({ issue, onView }: IssueCardProps) {
  const statusColor = getStatusColor(issue.status);
  const statusText = getStatusText(issue.status);
  
  // 判断是否延期
  const isOverdue = new Date(issue.endDate) < new Date() && issue.status !== '已处理' && issue.status !== '已确认';
  
  return (
    <tr 
      className="border-b border-gray-200 hover:bg-blue-50/50 hover:shadow-lg transition-all duration-200 cursor-pointer"
      onClick={() => onView(issue)}
    >
      {/* 问题名称 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{issue.name}</span>
          {isOverdue && (
            <span className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-50 rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              延期
            </span>
          )}
        </div>
      </td>

      {/* 问题类型 */}
      <td className="px-4 py-3">
        <span className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full whitespace-nowrap">
          {issue.type}
        </span>
      </td>

      {/* 状态 */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusColor}`}>
          <StatusIcon status={issue.status} />
          {statusText}
        </span>
      </td>

      {/* 解决结果 */}
      <td className="px-4 py-3">
        {issue.result ? (
          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getResultColor(issue.result)}`}>
            {issue.result}
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>

      {/* 🆕 解决方式 */}
      <td className="px-4 py-3">
        {issue.solution ? (
          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getSolutionColor(issue.solution)}`}>
            {issue.solution}
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>


      {/* 重要程度 */}
      <td className="px-4 py-3">
        {issue.priority ? (
          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getPriorityColor(issue.priority)}`}>
            {issue.priority}
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>

      {/* 紧急程度 */}
      <td className="px-4 py-3">
        {issue.urgency ? (
          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getUrgencyColor(issue.urgency)}`}>
            {issue.urgency}
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>




      {/* 解决人 */}
      <td className="px-4 py-3">
        {issue.solvers && issue.solvers.length > 0 ? (
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{issue.solvers.length}人</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>

      {/* 截止日期 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-700">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{new Date(issue.endDate).toLocaleDateString()}</span>
        </div>
      </td>
    </tr>
  );
}
