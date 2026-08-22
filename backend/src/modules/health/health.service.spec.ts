import { HealthService, ReadinessReport } from './health.service';

function makeDeps(dbUp: boolean, redisUp: boolean) {
  const prisma = { isHealthy: jest.fn().mockResolvedValue(dbUp) };
  const redis = { isHealthy: jest.fn().mockResolvedValue(redisUp) };
  return new HealthService(prisma as never, redis as never);
}

describe('HealthService.readiness', () => {
  it('reports ok when every dependency is up', async () => {
    const report: ReadinessReport = await makeDeps(true, true).readiness();

    expect(report.status).toBe('ok');
    expect(report.dependencies.database.status).toBe('up');
    expect(report.dependencies.redis.status).toBe('up');
    expect(typeof report.dependencies.database.latencyMs).toBe('number');
  });

  it('reports unavailable when the database is down', async () => {
    const report = await makeDeps(false, true).readiness();

    expect(report.status).toBe('unavailable');
    expect(report.dependencies.database.status).toBe('down');
    expect(report.dependencies.redis.status).toBe('up');
  });

  it('reports unavailable when redis is down', async () => {
    const report = await makeDeps(true, false).readiness();

    expect(report.status).toBe('unavailable');
    expect(report.dependencies.redis.status).toBe('down');
  });

  it('treats a thrown probe as down rather than failing the request', async () => {
    const prisma = { isHealthy: jest.fn().mockRejectedValue(new Error('boom')) };
    const redis = { isHealthy: jest.fn().mockResolvedValue(true) };
    const report = await new HealthService(prisma as never, redis as never).readiness();

    expect(report.dependencies.database.status).toBe('down');
    expect(report.status).toBe('unavailable');
  });
});
