// 删除所有任务、商机和项目数据的脚本
console.log('=== 开始删除所有数据 ===\n');

// 任务ID列表
const taskIds = [
  'da8988ea693929a2071852163c7bd9f4',
  'da8988ea69393022071927510512c305',
  '47985914693930cc070f142e2108e8ff',
  'da8988ea693a2b7e0735c54109672e4e',
  '8656c024693a2c300731cade4ceb53c4',
  'b4498fc8693a3964073ae7722fbdc0f7',
  '8f6c3a63693a3a56073987774cde2694',
  '8f6c3a63693a3a66073990cf37439626',
  'ba046a62693a3a740733c1fc74fa3cfa',
  'da8988ea693a3a830737c94a48cabf18',
  '4289fa81693a5ef30736b43016024230',
  'ba046a62693a6f960739a7f226c9424d',
  'b4498fc8693a6fb207414e5d60fa89c1',
  'def9fa84693b7ab0074e856747b3ca2a',
  '8e2c0a2f693b7b820751241848650702',
  'ab927786693b7c4e075ae55a7874f047'
];

// 商机ID列表
const opportunityIds = [
  'e18d0579693a66b4074925b57d6f44c6',
  'd84694f2693a6a9807387c6a0c83166d',
  '74337284693a6e390733430a52f708f0',
  'a2352464693b7a4b074d526c23a460ad',
  'e18d0579693b7c330766f8194c7b16ca'
];

// 项目ID列表
const projectIds = [
  'da8988ea6937a2cb06ebc6d94f842cd0',
  'd84694f26937a5e106e96f25309f4800',
  'a2352464693b87c6074efd016a7cb16d',
  'cd349d8f693b87ea0754f388694f7135',
  '8656c024693b8960075a55810dffd573'
];

console.log(`任务数量: ${taskIds.length}`);
console.log(`商机数量: ${opportunityIds.length}`);
console.log(`项目数量: ${projectIds.length}`);
console.log('\n请使用MCP工具删除这些数据');
console.log('\n✅ 数据ID列表已准备好');
