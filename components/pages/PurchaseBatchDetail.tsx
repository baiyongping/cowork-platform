import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, CheckCircle, XCircle, Clock, Lock } from 'lucide-react';

interface PurchaseItem {
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  specifications?: string;
}

interface PurchaseBatch {
  _id: string;
  budgetProjectId: string;
  batchNo: number;
  batchName: string;
  batchBudget: number;
  batchActual: number;
  status: '未开始' | '申请中' | '执行中' | '验收中' | '已完成' | '已取消';
  progress: number;
  applicationTaskId?: string;
  executionTaskId?: string;
  acceptanceTaskId?: string;
  purchaseItems: PurchaseItem[];
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  createdBy: string;
  createdAt: Date;
}

interface Task {
  _id: string;
  name: string;
  status: '未开始' | '进行中' | '已完成' | '延期' | '取消';
  progress: number;
  canStart: boolean;
  purchasePhase: '采购申请' | '采购执行' | '采购验收';
}

interface Props {
  batch: PurchaseBatch;
  onClose: () => void;
  onUpdate: () => void;
}

const PurchaseBatchDetail: React.FC<Props> = ({ batch, onClose, onUpdate }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedBatch, setEditedBatch] = useState<PurchaseBatch>(batch);

  useEffect(() => {
    loadTasks();
  }, [batch._id]);

  const loadTasks = async () => {
    try {
      const app = (window as any).app;
      const result = await app.callFunction({
        name: 'purchaseTask',
        data: {
          action: 'listByBatch',
          batchId: batch._id
        }
      });

      if (result.result.success) {
        setTasks(result.result.data);
      }
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '已完成':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case '进行中':
      case '申请中':
      case '执行中':
      case '验收中':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case '已取消':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Lock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case '采购申请':
        return 'bg-blue-100 text-blue-800';
      case '采购执行':
        return 'bg-green-100 text-green-800';
      case '采购验收':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      setLoading(true);
      const app = (window as any).app;
      const result = await app.callFunction({
        name: 'purchaseTask',
        data: {
          action: 'start',
          taskId
        }
      });

      if (result.result.success) {
        loadTasks();
        onUpdate();
      } else {
        alert(result.result.message);
      }
    } catch (error) {
      console.error('启动任务失败:', error);
      alert('启动任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!confirm('确认完成该任务？')) return;

    try {
      setLoading(true);
      const app = (window as any).app;
      const result = await app.callFunction({
        name: 'purchaseTask',
        data: {
          action: 'complete',
          taskId
        }
      });

      if (result.result.success) {
        loadTasks();
        onUpdate();
      } else {
        alert(result.result.message);
      }
    } catch (error) {
      console.error('完成任务失败:', error);
      alert('完成任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const app = (window as any).app;
      const result = await app.callFunction({
        name: 'purchaseBudget',
        data: {
          action: 'updateBatch',
          batchId: batch._id,
          updates: {
            batchName: editedBatch.batchName,
            batchBudget: editedBatch.batchBudget,
            purchaseItems: editedBatch.purchaseItems,
            plannedStartDate: editedBatch.plannedStartDate,
            plannedEndDate: editedBatch.plannedEndDate
          }
        }
      });

      if (result.result.success) {
        setEditMode(false);
        onUpdate();
      } else {
        alert(result.result.message);
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const addPurchaseItem = () => {
    setEditedBatch({
      ...editedBatch,
      purchaseItems: [
        ...editedBatch.purchaseItems,
        {
          itemName: '',
          quantity: 1,
          unit: '台',
          unitPrice: 0,
          totalPrice: 0
        }
      ]
    });
  };

  const updatePurchaseItem = (index: number, field: string, value: any) => {
    const items = [...editedBatch.purchaseItems];
    items[index] = { ...items[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      items[index].totalPrice = items[index].quantity * items[index].unitPrice;
    }

    setEditedBatch({ ...editedBatch, purchaseItems: items });
  };

  const removePurchaseItem = (index: number) => {
    const items = editedBatch.purchaseItems.filter((_, i) => i !== index);
    setEditedBatch({ ...editedBatch, purchaseItems: items });
  };

  const totalBudget = editedBatch.purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{batch.batchName}</h2>
            <span className={`px-2 py-1 rounded text-sm ${
              batch.status === '已完成' ? 'bg-green-100 text-green-800' :
              batch.status === '已取消' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {batch.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!editMode && batch.status !== '已完成' && batch.status !== '已取消' && (
              <button
                onClick={() => setEditMode(true)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">批次编号</label>
                <p className="font-medium">第 {batch.batchNo} 批</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">批次名称</label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedBatch.batchName}
                    onChange={(e) => setEditedBatch({ ...editedBatch, batchName: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded"
                  />
                ) : (
                  <p className="font-medium">{batch.batchName}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600">批次预算</label>
                {editMode ? (
                  <input
                    type="number"
                    value={editedBatch.batchBudget}
                    onChange={(e) => setEditedBatch({ ...editedBatch, batchBudget: parseFloat(e.target.value) })}
                    className="w-full px-3 py-1.5 border rounded"
                  />
                ) : (
                  <p className="font-medium">{batch.batchBudget.toFixed(2)} 万元</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600">实际支出</label>
                <p className="font-medium text-blue-600">{batch.batchActual.toFixed(2)} 万元</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">计划开始</label>
                {editMode ? (
                  <input
                    type="date"
                    value={editedBatch.plannedStartDate}
                    onChange={(e) => setEditedBatch({ ...editedBatch, plannedStartDate: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded"
                  />
                ) : (
                  <p className="font-medium">{batch.plannedStartDate}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600">计划结束</label>
                {editMode ? (
                  <input
                    type="date"
                    value={editedBatch.plannedEndDate}
                    onChange={(e) => setEditedBatch({ ...editedBatch, plannedEndDate: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded"
                  />
                ) : (
                  <p className="font-medium">{batch.plannedEndDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* 采购明细 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">采购明细</h3>
              {editMode && (
                <button
                  onClick={addPurchaseItem}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  添加
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">物品名称</th>
                    <th className="px-4 py-2 text-center">数量</th>
                    <th className="px-4 py-2 text-center">单位</th>
                    <th className="px-4 py-2 text-right">单价(万元)</th>
                    <th className="px-4 py-2 text-right">小计(万元)</th>
                    {editMode && <th className="px-4 py-2 text-center">操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {editedBatch.purchaseItems.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">
                        {editMode ? (
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => updatePurchaseItem(index, 'itemName', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                            placeholder="物品名称"
                          />
                        ) : (
                          item.itemName
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {editMode ? (
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updatePurchaseItem(index, 'quantity', parseFloat(e.target.value))}
                            className="w-20 px-2 py-1 border rounded text-center"
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {editMode ? (
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updatePurchaseItem(index, 'unit', e.target.value)}
                            className="w-16 px-2 py-1 border rounded text-center"
                          />
                        ) : (
                          item.unit
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updatePurchaseItem(index, 'unitPrice', parseFloat(e.target.value))}
                            className="w-24 px-2 py-1 border rounded text-right"
                          />
                        ) : (
                          item.unitPrice.toFixed(2)
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {item.totalPrice.toFixed(2)}
                      </td>
                      {editMode && (
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => removePurchaseItem(index)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="border-t font-bold bg-gray-50">
                    <td colSpan={4} className="px-4 py-2 text-right">合计:</td>
                    <td className="px-4 py-2 text-right">{totalBudget.toFixed(2)}</td>
                    {editMode && <td></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 任务流程 */}
          <div>
            <h3 className="font-semibold text-lg mb-3">任务流程</h3>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getPhaseColor(task.purchasePhase)}`}>
                          {task.purchasePhase}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        进度: {task.progress}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === '未开始' && task.canStart && (
                      <button
                        onClick={() => handleStartTask(task._id)}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        开始
                      </button>
                    )}
                    {task.status === '进行中' && (
                      <button
                        onClick={() => handleCompleteTask(task._id)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        完成
                      </button>
                    )}
                    {task.status === '未开始' && !task.canStart && (
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Lock className="w-4 h-4" />
                        等待前置任务完成
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        {editMode && (
          <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setEditMode(false);
                setEditedBatch(batch);
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              保存
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseBatchDetail;
