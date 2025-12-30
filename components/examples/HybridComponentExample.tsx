/**
 * 混合组件示例文件
 * 展示如何在同一个页面中同时使用 Radix UI 和 TDesign
 */

import { useState } from 'react';
import { 
  Table, 
  TableProps, 
  Button as TButton,
  Form,
  Input,
  DateRangePicker,
  Upload,
  MessagePlugin
} from 'tdesign-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';

/**
 * 混合组件示例页面
 * 
 * 使用原则：
 * 1. 基础 UI 交互（Dialog、Select、Switch）使用 Radix UI
 * 2. 复杂业务组件（Table、Form、Upload）使用 TDesign
 * 3. 样式统一使用 Tailwind CSS 类名
 */
export function HybridComponentExample() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // ========================================
  // TDesign Table 配置（复杂表格场景）
  // ========================================
  
  const tableData = [
    { id: 1, name: '张三', department: '研发部', status: '在职', joinDate: '2023-01-15' },
    { id: 2, name: '李四', department: '产品部', status: '在职', joinDate: '2023-03-20' },
    { id: 3, name: '王五', department: '设计部', status: '离职', joinDate: '2022-11-10' },
  ];
  
  const tableColumns: TableProps['columns'] = [
    {
      colKey: 'id',
      title: 'ID',
      width: 80,
    },
    {
      colKey: 'name',
      title: '姓名',
      width: 120,
    },
    {
      colKey: 'department',
      title: '部门',
      width: 150,
    },
    {
      colKey: 'status',
      title: '状态',
      width: 100,
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded text-xs ${
          row.status === '在职' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      colKey: 'joinDate',
      title: '入职日期',
      width: 150,
    },
    {
      colKey: 'actions',
      title: '操作',
      width: 150,
      cell: ({ row }) => (
        <div className="flex gap-2">
          {/* ✅ 使用 Radix UI Dialog 触发器（灵活性高） */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              console.log('编辑', row);
              setDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              console.log('删除', row);
              MessagePlugin.warning('删除功能暂未实现');
            }}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <div className="p-6 space-y-6">
      {/* ========================================
          标题栏（使用 Radix UI + Tailwind）
          ======================================== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">员工管理</h1>
          <p className="text-sm text-gray-500 mt-1">混合组件示例：TDesign + Radix UI</p>
        </div>
        
        {/* ✅ Radix UI Dialog（基础交互） */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加员工
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>添加员工</DialogTitle>
              <DialogDescription>
                填写员工基本信息，点击保存后提交
              </DialogDescription>
            </DialogHeader>
            
            {/* ✅ TDesign Form（复杂表单验证） */}
            <Form className="space-y-4">
              <Form.FormItem label="姓名" name="name">
                <Input placeholder="请输入姓名" />
              </Form.FormItem>
              
              <Form.FormItem label="部门" name="department">
                <Input placeholder="请输入部门" />
              </Form.FormItem>
              
              <Form.FormItem label="入职日期" name="joinDate">
                <DateRangePicker />
              </Form.FormItem>
              
              <Form.FormItem label="状态" name="status">
                {/* ✅ Radix UI Select（轻量、无障碍性强） */}
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>员工状态</SelectLabel>
                      <SelectItem value="在职">在职</SelectItem>
                      <SelectItem value="离职">离职</SelectItem>
                      <SelectItem value="试用期">试用期</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Form.FormItem>
            </Form>
            
            <DialogFooter>
              {/* ✅ Radix UI Button（样式灵活） */}
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={() => {
                MessagePlugin.success('保存成功');
                setDialogOpen(false);
              }}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* ========================================
          筛选栏（混合使用）
          ======================================== */}
      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        <div className="flex gap-4">
          {/* ✅ Radix UI Select（基础筛选） */}
          <div className="w-48">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              状态筛选
            </label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="在职">在职</SelectItem>
                <SelectItem value="离职">离职</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* ✅ TDesign DateRangePicker（复杂日期选择） */}
          <div className="w-80">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              入职日期范围
            </label>
            <DateRangePicker 
              placeholder={['开始日期', '结束日期']}
            />
          </div>
          
          <div className="flex items-end">
            <TButton theme="primary">搜索</TButton>
          </div>
        </div>
      </div>
      
      {/* ========================================
          数据表格（TDesign Table）
          ======================================== */}
      <div className="bg-white rounded-lg shadow-sm">
        {/* ✅ TDesign Table（复杂表格场景） */}
        <Table
          data={tableData}
          columns={tableColumns}
          rowKey="id"
          bordered
          hover
          stripe
          pagination={{
            defaultCurrent: 1,
            defaultPageSize: 10,
            total: tableData.length,
          }}
        />
      </div>
      
      {/* ========================================
          文件上传区（TDesign Upload）
          ======================================== */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">文件上传</h2>
        
        {/* ✅ TDesign Upload（复杂上传场景） */}
        <Upload
          action="https://service-bv448zsw-1257786608.gz.apigw.tencentcs.com/api/upload-demo"
          theme="image-flow"
          accept="image/*"
          multiple
          max={5}
          tips="支持批量上传，单个文件大小不超过 10MB"
        />
      </div>
      
      {/* ========================================
          使用说明
          ======================================== */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          🎯 组件使用原则
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✅ <strong>基础交互</strong>（Dialog、Select、Switch）使用 <strong>Radix UI</strong></li>
          <li>✅ <strong>复杂组件</strong>（Table、Form、Upload）使用 <strong>TDesign</strong></li>
          <li>✅ <strong>样式统一</strong>使用 <strong>Tailwind CSS</strong> 类名</li>
          <li>✅ <strong>按需加载</strong>，避免全量引入增加包体积</li>
        </ul>
      </div>
    </div>
  );
}
