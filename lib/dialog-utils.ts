/**
 * 统一提示框工具函数
 * 用于替换系统中的原生 alert() 和 confirm()
 * 
 * 使用示例:
 * import { showAlert, showConfirm, showToast } from '@/lib/dialog-utils';
 * 
 * // 替换 alert('消息')
 * await showAlert('消息');
 * 
 * // 替换 confirm('确认吗?')
 * const confirmed = await showConfirm('确认吗?');
 * if (confirmed) { ... }
 * 
 * // Toast 提示
 * showToast('操作成功', 'success');
 */

import type { DialogVariant } from '../components/ui/GlobalDialog';

// 全局 dialog 实例（由 DialogProvider 注入）
let globalDialogInstance: any = null;

export function setGlobalDialogInstance(instance: any) {
  globalDialogInstance = instance;
}

/**
 * 显示警告提示框（替代 alert）
 * @param message 提示消息
 * @param variant 提示类型: 'success' | 'error' | 'warning' | 'info'
 * @param title 标题（可选）
 */
export async function showAlert(
  message: string,
  variant: DialogVariant = 'info',
  title?: string
): Promise<void> {
  if (!globalDialogInstance) {
    console.warn('Dialog system not initialized, falling back to native alert');
    window.alert(message);
    return;
  }
  return globalDialogInstance.showAlert(message, variant, title);
}

/**
 * 显示确认对话框（替代 confirm）
 * @param message 确认消息
 * @param title 标题（可选）
 * @returns Promise<boolean> - true表示确认，false表示取消
 */
export async function showConfirm(
  message: string,
  title?: string
): Promise<boolean> {
  if (!globalDialogInstance) {
    console.warn('Dialog system not initialized, falling back to native confirm');
    return window.confirm(message);
  }
  return globalDialogInstance.showConfirm(message, title);
}

/**
 * 显示Toast提示（自动消失）
 * @param message 提示消息
 * @param variant 提示类型
 * @param duration 显示时长（毫秒）
 */
export function showToast(
  message: string,
  variant: DialogVariant = 'success',
  duration = 3000
): void {
  if (!globalDialogInstance) {
    console.warn('Dialog system not initialized, falling back to native alert');
    window.alert(message);
    return;
  }
  globalDialogInstance.showToast(message, variant, duration);
}

/**
 * 便捷方法：显示成功提示
 */
export async function showSuccess(message: string, title?: string) {
  return showAlert(message, 'success', title);
}

/**
 * 便捷方法：显示错误提示
 */
export async function showError(message: string, title?: string) {
  return showAlert(message, 'error', title);
}

/**
 * 便捷方法：显示警告提示
 */
export async function showWarning(message: string, title?: string) {
  return showAlert(message, 'warning', title);
}

/**
 * 便捷方法：显示信息提示
 */
export async function showInfo(message: string, title?: string) {
  return showAlert(message, 'info', title);
}

/**
 * 便捷方法：显示成功Toast
 */
export function toastSuccess(message: string) {
  showToast(message, 'success');
}

/**
 * 便捷方法：显示错误Toast
 */
export function toastError(message: string) {
  showToast(message, 'error');
}

/**
 * 便捷方法：显示警告Toast
 */
export function toastWarning(message: string) {
  showToast(message, 'warning');
}

/**
 * 便捷方法：显示信息Toast
 */
export function toastInfo(message: string) {
  showToast(message, 'info');
}
