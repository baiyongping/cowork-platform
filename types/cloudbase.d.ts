/**
 * CloudBase 数据库操作返回类型扩展
 * 解决 TypeScript 类型定义不完整的问题
 */

declare module '@cloudbase/js-sdk' {
  export interface SetRes {
    code?: string;
    message?: string;
    id?: string;  // 添加 id 属性
    _id?: string; // MongoDB 风格的 _id
    requestId?: string;
  }

  export interface GetRes {
    code?: string;
    message?: string;
    data?: any[];
    requestId?: string;
  }

  export interface UpdateRes {
    code?: string;
    message?: string;
    updated?: number;
    requestId?: string;
  }

  export interface RemoveRes {
    code?: string;
    message?: string;
    deleted?: number;
    requestId?: string;
  }
}
