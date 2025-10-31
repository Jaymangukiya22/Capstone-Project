import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  vus: __ENV.VUS ? Number(__ENV.VUS) : 30,
  duration: __ENV.DURATION || '5m',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('health', () => {
    const res = http.get(`${BASE}/health`);
    check(res, { '200': r => r.status === 200 });
  });

  group('categories', () => {
    let res = http.get(`${BASE}/api/categories?hierarchy=true&includeQuizzes=true&depth=2`);
    check(res, { '<400': r => r.status < 400 });
    res = http.get(`${BASE}/api/categories`);
    check(res, { '<400': r => r.status < 400 });
  });

  group('quizzes', () => {
    let res = http.get(`${BASE}/api/quizzes`);
    check(res, { '<400': r => r.status < 400 });
    // If any quiz exists, fetch by id
    try {
      const data = res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        const id = data.data[0].id;
        const r2 = http.get(`${BASE}/api/quizzes/${id}`);
        check(r2, { '<400': r => r.status < 400 });
        const r3 = http.get(`${BASE}/api/quizzes/${id}/play`);
        check(r3, { '<400': r => r.status < 400 });
      }
    } catch (_) {}
  });

  group('question-bank', () => {
    const res = http.get(`${BASE}/api/question-bank?limit=20`);
    check(res, { '<400': r => r.status < 400 });
  });

  group('quiz-attempts (user)', () => {
    // Requires fallback user in dev (user id 1)
    const res = http.get(`${BASE}/api/quiz-attempts/history/user`);
    check(res, { '<400': r => r.status < 400 });
  });

  group('matches (http)', () => {
    let res = http.get(`${BASE}/api/matches/available`);
    check(res, { '<400': r => r.status < 400 });
  });

  sleep(0.4 + Math.random()*0.4);
}
