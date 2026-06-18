// functions/index.js
import { onRequest as handleSlugRequest } from './[slug]/index.js';

export async function onRequest(context) {
  return handleSlugRequest({
    ...context,
    params: {
      ...(context.params || {}),
      slug: ''
    }
  });
}
