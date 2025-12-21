import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { db } from '../lib/cloudbase';

interface EmployeeTrashProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeTrash({ onClose, onSuccess }: EmployeeTrashProps) {
  const [deletedEmployees, setDeletedEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  useEffect(() => {
    loadDeletedEmployees();
  }, []);

  const loadDeletedEmployees = async () => {
    setLoading(true);
    try {
      const result = await db.collection('users')
        .where({
          deleted: true,
          approvalStatus: 'approved'
        })
        .get();
      
      setDeletedEmployees(result.data || []);
    } catch (error) {
      console.error('加载回收站员工失败:', error);
      alert('加载失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedEmployee) return;
    
    try {
      await db.collection('users').doc(selectedEmployee._id).update({
        deleted: false,
        deletedAt: null
      });

      // 记录操作日志
      await db.collection('operation_logs').add({
        userId: selectedEmployee._id,
        module: '员工管理',
        action: '恢复员工',
        content: `从回收站恢复员工 ${selectedEmployee.name}`,
        ipAddress: 'unknown',
        createdAt: new Date()
      });

      alert('恢复成功');
      setShowRestoreConfirm(false);
      setSelectedEmployee(null);
      loadDeletedEmployees();
      onSuccess();
    } catch (error) {
      console.error('恢复员工失败:', error);
      alert('恢复失败: ' + (error as any).message);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedEmployee) return;
    
    try {
      // 永久删除用户记录
      await db.collection('users').doc(selectedEmployee._id).remove();

      // 记录操作日志
      await db.collection('operation_logs').add({
        userId: selectedEmployee._id,
        module: '员工管理',
        action: '永久删除员工',
        content: `永久删除员工 ${selectedEmployee.name}`,
        ipAddress: 'unknown',
        createdAt: new Date()
      });

      alert('已永久删除');
      setShowDeleteConfirm(false);
      setSelectedEmployee(null);
      loadDeletedEmployees();
      onSuccess();
    } catch (error) {
      console.error('永久删除员工失败:', error);
      alert('删除失败: ' + (error as any).message);
    }
  };

  const openRestoreConfirm = (employee: any) => {
    setSelectedEmployee(employee);
    setShowRestoreConfirm(true);
  };

  const openDeleteConfirm = (employee: any) => {
    setSelectedEmployee(employee);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">员工回收站</h2>
              <p className="text-sm text-gray-500">共 {deletedEmployees.length} 个已删除的员工</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          ) : deletedEmployees.length === 0 ? (
            <div className="p-12 text-center">
              <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">回收站是空的</p>
              <p className="text-gray-400 text-sm mt-2">已删除的员工会显示在这里</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">姓名</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">用户名</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">手机号</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">部门</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">删除时间</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deletedEmployees.map((employee) => (
                    <tr key={employee._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{employee.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{employee.username}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{employee.phone || '-'}</td>
                      <td className="px-6 py-4">
                        {employee.departments && employee.departments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {employee.departments.map((dept: string, index: number) => (
                              <span key={index} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                {dept}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {employee.deletedAt 
                          ? new Date(employee.deletedAt).toLocaleString('zh-CN')
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openRestoreConfirm(employee)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            恢复
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(employee)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            永久删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span>永久删除后将无法恢复</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>

      {/* 恢复确认模态框 */}
      {showRestoreConfirm && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">确认恢复</h3>
            </div>
            <p className="text-gray-600 mb-6">
              确定要恢复员工 <span className="font-semibold">{selectedEmployee.name}</span> 吗？
              恢复后该员工将重新出现在员工列表中。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setSelectedEmployee(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRestore}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                确认恢复
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 永久删除确认模态框 */}
      {showDeleteConfirm && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">确认永久删除</h3>
            </div>
            <p className="text-gray-600 mb-6">
              <span className="font-semibold text-red-600">警告：</span>
              确定要永久删除员工 <span className="font-semibold">{selectedEmployee.name}</span> 吗？
              此操作将无法撤销！
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedEmployee(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePermanentDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                永久删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
