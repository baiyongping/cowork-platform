/**
 * 目标分解表配置集合
 * 用于定义目标分解的表结构（横纵轴维度）
 */

const collectionName = 'decompositionTables';

/**
 * 集合结构说明
 * {
 *   _id: string,                    // 自动生成
 *   name: string,                   // 表名（必填，唯一）
 *   horizontalDimension: {          // 横轴维度
 *     dimensionId: string,          // 维度ID
 *     dimensionName: string,        // 维度名称（如"地域"）
 *     values: string[]              // 维度值列表（如["华北", "华东", "华南"]）
 *   },
 *   verticalDimension: {            // 纵轴维度
 *     dimensionId: string,
 *     dimensionName: string,        // 维度名称（如"季度"）
 *     values: string[]              // 维度值列表（如["Q1", "Q2", "Q3", "Q4"]）
 *   },
 *   createdAt: Date,                // 创建时间
 *   updatedAt: Date,                // 更新时间
 *   createdBy: string               // 创建人（用户ID）
 * }
 */

/**
 * 索引配置
 */
const indexes = [
  {
    keys: { name: 1 },
    options: { 
      unique: true,
      name: 'idx_name_unique',
      background: true 
    }
  },
  {
    keys: { createdAt: -1 },
    options: { 
      name: 'idx_createdAt',
      background: true 
    }
  },
  {
    keys: { 'horizontalDimension.dimensionId': 1 },
    options: { 
      name: 'idx_horizontal_dimension',
      background: true 
    }
  },
  {
    keys: { 'verticalDimension.dimensionId': 1 },
    options: { 
      name: 'idx_vertical_dimension',
      background: true 
    }
  }
];

/**
 * 权限规则
 * 继承"维度设置Tab"权限，无需单独校验
 */
const securityRules = {
  read: true,
  write: 'auth.uid != null' // 登录用户可写
};

module.exports = {
  collectionName,
  indexes,
  securityRules
};
