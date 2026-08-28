import type { Route } from '@/types';
import { ViewType } from '@/types';

import { handler, route as ushknewsFlashRoute } from '../ushknews/flash';

export const route: Route = {
    path: '/flash/:channel?',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/jin10/flash',
    cacheTtl: ushknewsFlashRoute.cacheTtl,
    parameters: ushknewsFlashRoute.parameters,
    features: ushknewsFlashRoute.features,
    radar: [
        {
            source: ['ushknews.com/'],
            target: '/flash/:channel?',
        },
    ],
    name: '美港电讯',
    maintainers: ['laampui', 'luck'],
    handler,
    description: `\`/jin10/flash\` 是 \`/ushknews\` 的别名，数据来自 ushknews.com，请优先使用 \`/ushknews\`。

${ushknewsFlashRoute.description}`,
};
