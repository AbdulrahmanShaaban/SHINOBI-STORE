import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { argon2id } from 'hash-wasm';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';

/**
 * Content & media contract tests (§Phase 8) through the real HTTP pipeline:
 * global guard chain, AdminGuard + @RequirePermissions wiring, upload trust
 * boundaries (magic bytes, size cap, server-owned folder taxonomy), the
 * section-config validation gate and the usage-checked delete rule.
 *
 * Persistence is stubbed exactly like the other contract suites; the storage
 * adapter resolves to LocalMockAdapter because no CLOUDINARY_* env is set.
 */

process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = ''; // force mock payment provider
delete process.env.CLOUDINARY_CLOUD_NAME;
delete process.env.CLOUDINARY_API_KEY;
delete process.env.CLOUDINARY_API_SECRET;

const TEST_PASSWORD = 'rasengan1234';

const ADMIN = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaae1',
  email: 'tsunade@konoha.jp',
  fullName: 'Tsunade Senju',
  role: 'admin',
};

const MANAGER = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbe1',
  email: 'iruka@konoha.jp',
  fullName: 'Iruka Umino',
  role: 'order_manager', // holds neither media:w nor content:w
};

const SECTION_ID = 'ccccccc1-0000-4000-8000-000000000001';
const MEDIA_ID = 'ddddddd1-0000-4000-8000-000000000001';

function pick(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in row) out[key] = row[key];
  }
  return out;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** Signature + plausible payload — big enough to exercise real parsing paths. */
const PNG_FIXTURE = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(64, 0xae)]);

const SEEDED_SECTIONS = [
  { key: 'hero', isVisible: true, sortOrder: 10, config: { title: 'Own the legend' } },
  { key: 'featured_products', isVisible: true, sortOrder: 20, config: { productSlugs: ['naruto-rasengan-hoodie'] } },
  { key: 'featured_characters', isVisible: true, sortOrder: 30, config: { items: [] } },
  { key: 'trending_anime', isVisible: true, sortOrder: 40, config: { animeSlugs: ['naruto'] } },
  { key: 'collections', isVisible: true, sortOrder: 50, config: { items: [] } },
  { key: 'banner', isVisible: true, sortOrder: 60, config: { title: 'Hidden Leaf Sale' } },
  { key: 'testimonials', isVisible: true, sortOrder: 70, config: { items: [] } },
];

function buildDb() {
  const users = new Map<string, Record<string, unknown>>();
  for (const u of [ADMIN, MANAGER]) {
    users.set(u.email, { ...u, isActive: true, deletedAt: null, passwordHash: '' });
  }

  const sessions = new Map<string, { id: string; expiresAt: Date; revokedAt: Date | null }>();
  const sessionOwners = new Map<string, string>();

  const db = {
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.email) {
          return Promise.resolve(users.get(String(where.email).toLowerCase()) ?? null);
        }
        return Promise.resolve(null);
      }),
    },
    session: {
      create: jest.fn().mockImplementation(({ data }) => {
        sessions.set(data.tokenHash, {
          id: `sess-${sessions.size + 1}`,
          expiresAt: data.expiresAt,
          revokedAt: null,
        });
        sessionOwners.set(data.tokenHash, String(data.userId));
        return Promise.resolve({ id: 's1' });
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const row = sessions.get(where.tokenHash);
        if (!row) return Promise.resolve(null);
        const ownerEmail = sessionOwners.get(where.tokenHash)!;
        const email = [...users.values()].find((u) => u.id === ownerEmail)!.email as string;
        const u = users.get(email)!;
        return Promise.resolve({
          id: row.id,
          expiresAt: row.expiresAt,
          revokedAt: row.revokedAt,
          user: {
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            isActive: u.isActive,
            deletedAt: u.deletedAt,
          },
        });
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    homepageSection: {
      findMany: jest.fn().mockImplementation(({ orderBy } = {}) => {
        const rows = [...SEEDED_SECTIONS];
        if (orderBy?.key) rows.sort((a, b) => (a.key < b.key ? -1 : 1));
        if (orderBy?.sortOrder) rows.sort((a, b) => a.sortOrder - b.sortOrder);
        return Promise.resolve(rows);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(
          SEEDED_SECTIONS.find((s) => s.key === where.key)
            ? { id: SECTION_ID, ...SEEDED_SECTIONS.find((s) => s.key === where.key), createdAt: new Date(), updatedAt: new Date() }
            : null,
        ),
      ),
      update: jest.fn().mockImplementation(({ where, data }) =>
        Promise.resolve({
          id: SECTION_ID,
          ...SEEDED_SECTIONS.find((s) => s.key === where.key),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        }),
      ),
    },
    mediaEntry: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: MEDIA_ID,
          provider: data.provider,
          publicId: data.publicId,
          url: data.url,
          width: data.width,
          height: data.height,
          format: data.format,
          bytes: data.bytes,
          folder: data.folder,
          altText: null,
          uploadedByAdminId: data.uploadedByAdminId ?? null,
          createdAt: new Date('2026-08-23T10:00:00Z'),
        }),
      ),
      findUnique: jest.fn().mockImplementation(({ where, select }) => {
        if (where.id !== MEDIA_ID) return Promise.resolve(null);
        const row = {
          id: MEDIA_ID,
          provider: 'local-mock',
          publicId: 'hero/deadbeefdeadbeef',
          url: '/media/hero/deadbeefdeadbeef.svg',
          width: 1200,
          height: 800,
          format: 'svg',
          bytes: 1024,
          folder: 'hero',
          altText: null,
          uploadedByAdminId: ADMIN.id,
          createdAt: new Date('2026-08-23T10:00:00Z'),
        };
        return Promise.resolve(select ? pick(row, Object.keys(select)) : row);
      }),
      delete: jest.fn().mockResolvedValue({ id: MEDIA_ID }),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    productImage: {
      count: jest.fn().mockResolvedValue(0),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockImplementation((fn: (tx: typeof db) => Promise<unknown>) => fn(db)),
  };

  return { db, users, sessions, sessionOwners };
}

function redisStub() {
  const boom = () => jest.fn().mockRejectedValue(new Error('no redis in contract tests'));
  return {
    client: { get: boom(), set: boom(), del: boom(), incr: boom(), expire: boom() },
    isHealthy: jest.fn().mockResolvedValue(false),
  };
}

describe('Content & media API contracts (e2e, db-stubbed)', () => {
  let app: NestExpressApplication;
  let harness: ReturnType<typeof buildDb>;

  async function loginAs(email: string): Promise<string[]> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-csrf-token', '1')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    return res.headers['set-cookie'] as unknown as string[];
  }

  beforeAll(async () => {
    harness = buildDb();

    for (const staff of [ADMIN, MANAGER]) {
      const row = harness.users.get(staff.email)!;
      row.passwordHash = await argon2id({
        password: TEST_PASSWORD,
        salt: randomBytes(16),
        parallelism: 1,
        iterations: 2,
        memorySize: 19456,
        hashLength: 32,
        outputType: 'encoded',
      });
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(harness.db)
      .overrideProvider(RedisService)
      .useValue(redisStub())
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    await configureApp(app);
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  }, 30_000);

  describe('POST /admin/media (upload)', () => {
    it('answers 401 without a session', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/media')
        .attach('file', PNG_SIGNATURE, { filename: 'x.png', contentType: 'image/png' })
        .expect(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('answers 403 for staff lacking media:w', async () => {
      const cookies = await loginAs(MANAGER.email);
      await request(app.getHttpServer())
        .post('/api/v1/admin/media')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .attach('file', PNG_SIGNATURE, { filename: 'x.png', contentType: 'image/png' })
        .query({ folder: 'hero' })
        .expect(403);
    });

    it('rejects a non-image payload despite its image mimetype (magic bytes win)', async () => {
      const cookies = await loginAs(ADMIN.email);
      const fake = Buffer.concat([Buffer.from('<html>not an image at all</html>')]);
      await request(app.getHttpServer())
        .post('/api/v1/admin/media')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .attach('file', fake, { filename: 'evil.png', contentType: 'image/png' })
        .query({ folder: 'hero' })
        .expect(400)
        .then((res) => expect(res.body.code).toBe('UNSUPPORTED_FORMAT'));
    });

    it('rejects an oversized image payload at the validation layer with 400', async () => {
      const cookies = await loginAs(ADMIN.email);
      const oversized = Buffer.alloc(10 * 1024 * 1024 + 1);
      PNG_SIGNATURE.copy(oversized);
      await request(app.getHttpServer())
        .post('/api/v1/admin/media')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .attach('file', oversized, { filename: 'big.png', contentType: 'image/png' })
        .query({ folder: 'hero' })
        .expect(400)
        .then((res) => expect(res.body.code).toBe('FILE_TOO_LARGE'));
    });

    it('rejects folders outside the server-side taxonomy (global pipe gate)', async () => {
      const cookies = await loginAs(ADMIN.email);
      await request(app.getHttpServer())
        .post('/api/v1/admin/media')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .attach('file', PNG_SIGNATURE, { filename: 'x.png', contentType: 'image/png' })
        .query({ folder: '../../../etc' })
        .expect(400)
        .then((res) => expect(res.body.code).toBe('VALIDATION_ERROR'));
    });

    it('rejects uploads without any folder at the service boundary', async () => {
      const cookies = await loginAs(ADMIN.email);
      await request(app.getHttpServer())
        .post('/api/v1/admin/media')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .attach('file', PNG_SIGNATURE, { filename: 'x.png', contentType: 'image/png' })
        .expect(400)
        .then((res) => expect(res.body.code).toBe('FOLDER_INVALID'));
    });

    it('stores a valid png via the mock adapter, audits it and returns the entry row', async () => {
      const cookies = await loginAs(ADMIN.email);
      harness.db.auditLog.create.mockClear();
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/media')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .attach('file', PNG_FIXTURE, { filename: 'rasengan.png', contentType: 'image/png' })
        .query({ folder: 'hero' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: MEDIA_ID,
        provider: 'local-mock',
        folder: 'hero',
        uploadedByAdminId: ADMIN.id,
      });
      expect(res.body.url).toMatch(/^\/media\/hero\/[0-9a-f]{32}\.svg$/);
      expect(harness.db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorUserId: ADMIN.id,
            action: 'media.upload',
            entityType: 'media_entry',
            entityId: MEDIA_ID,
          }),
        }),
      );
    });
  });

  describe('GET /admin/media', () => {
    it('lists paginated newest-first entries behind media:w', async () => {
      const cookies = await loginAs(ADMIN.email);
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/media?page=2')
        .set('Cookie', cookies)
        .expect(200);
      expect(res.body).toEqual({
        items: [],
        meta: { page: 2, limit: 24, total: 0, totalPages: 1 },
      });
    });
  });

  describe('DELETE /admin/media/:id', () => {
    it('refuses deletion while a product image still references the asset', async () => {
      const cookies = await loginAs(ADMIN.email);
      harness.db.productImage.count.mockResolvedValueOnce(1);
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/media/${MEDIA_ID}`)
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .expect(409)
        .then((res) => expect(res.body.code).toBe('MEDIA_IN_USE'));
      expect(harness.db.mediaEntry.delete).not.toHaveBeenCalled();
    });

    it('deletes unused media, audits it and echoes the removed id', async () => {
      const cookies = await loginAs(ADMIN.email);
      harness.db.auditLog.create.mockClear();
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/admin/media/${MEDIA_ID}`)
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .expect(200);
      expect(res.body).toEqual({ id: MEDIA_ID });
      expect(harness.db.mediaEntry.delete).toHaveBeenCalledWith({ where: { id: MEDIA_ID } });
      expect(harness.db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'media.delete', entityType: 'media_entry' }),
        }),
      );
    });

    it('404s unknown media ids', async () => {
      const cookies = await loginAs(ADMIN.email);
      await request(app.getHttpServer())
        .delete('/api/v1/admin/media/eeeeeee1-0000-4000-8000-000000000001')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .expect(404)
        .then((res) => expect(res.body.code).toBe('MEDIA_NOT_FOUND'));
    });
  });

  describe('GET /content/media/:id (public)', () => {
    it('exposes only renderable facts', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/content/media/${MEDIA_ID}`)
        .expect(200);
      expect(res.body).toEqual({ url: '/media/hero/deadbeefdeadbeef.svg', width: 1200, height: 800, format: 'svg' });
    });
  });

  describe('GET /content/homepage (public)', () => {
    it('returns all seven seeded sections in render order, cacheable shape', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/content/homepage').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(7);
      for (const section of res.body) {
        expect(Object.keys(section).sort()).toEqual(['config', 'isVisible', 'key', 'sortOrder']);
      }
      expect(res.body.map((s: { key: string }) => s.key)).toEqual([
        'hero',
        'featured_products',
        'featured_characters',
        'trending_anime',
        'collections',
        'banner',
        'testimonials',
      ]);
      // Cacheable-friendly: shared cache TTL, no Set-Cookie on public reads.
      expect(res.headers['cache-control']).toContain('public');
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('PATCH /admin/content/sections/:key', () => {
    it('rejects invalid configs with 400 VALIDATION_ERROR + reason', async () => {
      const cookies = await loginAs(ADMIN.email);
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/content/sections/hero')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ config: {} }) // hero.title is required
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('title');

      await request(app.getHttpServer())
        .patch('/api/v1/admin/content/sections/hero')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ config: { title: 'x'.repeat(81) } })
        .expect(400);
    });

    it('persists a valid config and records the audit entry', async () => {
      const cookies = await loginAs(ADMIN.email);
      harness.db.auditLog.create.mockClear();
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/content/sections/hero')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({
          isVisible: false,
          sortOrder: 5,
          config: { title: 'New drop live now', ctaLabel: 'Look', ctaHref: '/products' },
        })
        .expect(200);

      expect(res.body).toMatchObject({
        key: 'hero',
        isVisible: false,
        sortOrder: 5,
        config: { title: 'New drop live now', ctaLabel: 'Look', ctaHref: '/products' },
      });
      expect(harness.db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorUserId: ADMIN.id,
            action: 'content.update',
            entityType: 'homepage_section',
            entityId: SECTION_ID,
          }),
        }),
      );
    });

    it('rejects unknown keys and foreign fields', async () => {
      const cookies = await loginAs(ADMIN.email);
      await request(app.getHttpServer())
        .patch('/api/v1/admin/content/sections/not-a-section')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ isVisible: true })
        .expect(404)
        .then((res) => expect(res.body.code).toBe('SECTION_NOT_FOUND'));

      await request(app.getHttpServer())
        .patch('/api/v1/admin/content/sections/hero')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ slug: 'smuggled' })
        .expect(400); // whitelist forbids non-DTO fields
    });

    it('stays closed to staff without content:w', async () => {
      const cookies = await loginAs(MANAGER.email);
      await request(app.getHttpServer())
        .patch('/api/v1/admin/content/sections/hero')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ isVisible: false })
        .expect(403);
    });
  });

  describe('GET /admin/content/sections', () => {
    it('lists every section ordered by key', async () => {
      const cookies = await loginAs(ADMIN.email);
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/content/sections')
        .set('Cookie', cookies)
        .expect(200);
      expect(res.body.map((s: { key: string }) => s.key)).toEqual([
        'banner',
        'collections',
        'featured_characters',
        'featured_products',
        'hero',
        'testimonials',
        'trending_anime',
      ]);
    });
  });
});
