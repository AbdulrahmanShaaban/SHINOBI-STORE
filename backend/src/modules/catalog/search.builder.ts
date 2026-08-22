import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Upper bound on ranked candidates held in memory per search (§18: offset/limit is fine at catalog scale). */
export const MAX_SEARCH_CANDIDATES = 500;

/**
 * Full-text + trigram candidate resolution.
 * Returns active product ids ordered by relevance: weighted ts_rank_cd over the
 * trigger-maintained vector (A=name, B=anime/character/tags, C=description),
 * a small featured boost, and a pg_trgm name-similarity fallback that catches
 * typos/partial words the lexemes miss.
 *
 * websearch_to_tsquery never throws on arbitrary user input (unlike to_tsquery),
 * so untrusted query strings need no pre-validation; the value is still passed
 * strictly as a bound parameter.
 */
export async function searchProductIds(prisma: PrismaService, search: string): Promise<string[]> {
  const term = search.trim();
  if (!term) return [];

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT p.id
    FROM products p
    WHERE p.status = 'active'
      AND (
        p.search @@ websearch_to_tsquery('english', ${term})
        OR p.name % ${term}
        OR p.name ILIKE ${'%' + term + '%'}
      )
    ORDER BY (
      ts_rank_cd(p.search, websearch_to_tsquery('english', ${term})) * 2.0
      + CASE WHEN p.featured THEN 0.25 ELSE 0 END
      + similarity(p.name, ${term})
    ) DESC, p.created_at DESC
    LIMIT ${MAX_SEARCH_CANDIDATES}
  `);
  return rows.map((r) => r.id);
}
