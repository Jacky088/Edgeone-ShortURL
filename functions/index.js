// functions/index.js
// 处理根路径 / 请求，将其路由到主页处理器

import { onRequest as handleSlugRequest } from './[slug]/index.js';

export async function onRequest(context) {
  // 只处理根路径请求
  // API 路径、静态资源等会由其他处理器自动处理
  return handleSlugRequest({
    ...context,
    params: {
      ...(context.params || {}),
      slug: ''  // 空 slug 表示根路径
    }
  });
}
