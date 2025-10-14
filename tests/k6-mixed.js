import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  scenarios: {
    reads: { executor: 'constant-vus', exec: 'reads', vus: __ENV.VUS_READS ? Number(__ENV.VUS_READS) : 40, duration: __ENV.DURATION || '5m' },
    writes: { executor: 'constant-vus', exec: 'writes', vus: __ENV.VUS_WRITES ? Number(__ENV.VUS_WRITES) : 10, duration: __ENV.DURATION || '5m', startTime: '0s' }
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<600'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export function reads () {
  group('list-quizzes', () => {
    const r = http.get(`${BASE}/api/quizzes?limit=50`);
    check(r, { '<400': x => x.status < 400 });
  });
  group('list-categories', () => {
    const r = http.get(`${BASE}/api/categories?hierarchy=true&includeQuizzes=true&depth=2`);
    check(r, { '<400': x => x.status < 400 });
  });
  group('question-bank', () => {
    const r = http.get(`${BASE}/api/question-bank?limit=50`);
    check(r, { '<400': x => x.status < 400 });
  });
  sleep(0.3 + Math.random()*0.5);
}

export function writes () {
  // Use safe write endpoints that don't damage data (friend match creation)
  // Backend uses testing mode with default user id fallback
  const quizId = __ENV.QUIZ_ID ? Number(__ENV.QUIZ_ID) : 1;
  const payload = JSON.stringify({ quizId });
  const params = { headers: { 'Content-Type': 'application/json' } };

  group('create-friend-match', () => {
    const r = http.post(`${BASE}/api/friend-matches`, payload, params);
    check(r, { '<400': x => x.status < 400 });
    if (r.status < 400) {
      try {
        const data = r.json();
        const matchId = data?.data?.matchId || data?.matchId;
        if (matchId) {
          // Fetch match info
          const r2 = http.get(`${BASE}/api/matches/${matchId}`);
          check(r2, { '<400': x => x.status < 400 });
        }
      } catch (_) {}
    }
  });

  sleep(0.8 + Math.random()*0.5);
}
