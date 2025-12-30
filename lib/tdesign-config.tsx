/**
 * TDesign 配置文件
 * 用于统一配置 TDesign 主题和样式
 */

import { ConfigProvider } from 'tdesign-react';
import { ReactNode } from 'react';

// TDesign 主题配置（与 Tailwind 协调一致）
export const tdesignTheme = {
  // 品牌色（与 Tailwind blue-600 一致）
  brandColor: '#2563eb',
  
  // 警告色（与 Tailwind yellow-500 一致）
  warningColor: '#eab308',
  
  // 错误色（与 Tailwind red-600 一致）
  errorColor: '#dc2626',
  
  // 成功色（与 Tailwind green-600 一致）
  successColor: '#16a34a',
};

// TDesign 全局配置
export const tdesignGlobalConfig = {
  // 组件尺寸
  size: 'medium' as const,
  
  // 按需加载样式
  classPrefix: 't',
};

/**
 * TDesign Provider 包装器
 * 用于在应用中启用 TDesign 并配置主题
 */
interface TDesignProviderProps {
  children: ReactNode;
}

export function TDesignProvider({ children }: TDesignProviderProps) {
  return (
    <ConfigProvider 
      theme={tdesignTheme}
      globalConfig={tdesignGlobalConfig}
    >
      {children}
    </ConfigProvider>
  );
}

/**
 * 工具函数：判断是否需要使用 TDesign 组件
 * 
 * @returns 组件推荐使用规则
 */
export const componentGuide = {
  // 优先使用 Radix UI（轻量、灵活、无障碍性强）
  radix: [
    'Dialog',      // 对话框
    'Popover',     // 弹出框
    'Tooltip',     // 提示
    'Select',      // 简单选择器
    'Switch',      // 开关
    'Checkbox',    // 复选框
    'RadioGroup',  // 单选
    'Slider',      // 滑块
    'Tabs',        // 标签页
    'Accordion',   // 折叠面板
  ],
  
  // 优先使用 TDesign（复杂场景、企业级组件）
  tdesign: [
    'Table',              // 复杂表格（虚拟滚动、树形、可编辑）
    'Form',               // 表单验证
    'DateRangePicker',    // 日期范围选择器
    'Upload',             // 文件上传
    'Transfer',           // 穿梭框
    'Cascader',           // 级联选择器
    'TimePicker',         // 时间选择器
    'Tree',               // 树形控件
    'Steps',              // 步骤条
    'Breadcrumb',         // 面包屑
  ],
};
