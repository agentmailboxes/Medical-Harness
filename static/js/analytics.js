import { inject } from '@vercel/analytics';

inject({
  mode: 'production',
  debug: false,
  beforeSend(event) {
    if (event.type !== 'pageview') return null;
    return { ...event, url: `${location.origin}/` };
  },
});
