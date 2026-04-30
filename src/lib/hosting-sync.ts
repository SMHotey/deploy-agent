import { db } from '@/db';
import { hostingProviders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import https from 'https';

interface ProviderUpdate {
  slug: string;
  updates: Partial<{
    commissionRate: string;
    commissionType: string;
    minPayout: number;
    paymentTerms: string;
    isActive: boolean;
    features: string[];
    pricing: any[];
  }>;
}

/**
 * Weekly job to sync hosting provider data from affiliate networks
 * This keeps commission rates, features, and pricing up-to-date
 *
 * Runs via: node -e "require('./dist/lib/hosting-sync.js').syncHostingProviders()"
 * Or set up a cron: 0 0 * * 0 node /path/to/dist/lib/hosting-sync.js
 */
export async function syncHostingProviders(): Promise<{
  updated: number;
  failed: number;
  details: string[];
}> {
  const details: string[] = [];
  let updated = 0;
  let failed = 0;

  console.log('[Hosting Sync] Starting weekly sync...');

  // 1. Sync from affiliate APIs (if available)
  const affiliateUpdates = await fetchAffiliateUpdates();
  for (const update of affiliateUpdates) {
    try {
      const result = await db.update(hostingProviders)
        .set({ ...update.updates, updatedAt: new Date() })
        .where(eq(hostingProviders.slug, update.slug))
        .returning({ id: hostingProviders.id, name: hostingProviders.name });

      if (result.length > 0) {
        updated++;
        details.push(`✓ Updated ${result[0].name}: ${JSON.stringify(update.updates)}`);
      }
    } catch (error) {
      failed++;
      details.push(`✗ Failed to update ${update.slug}: ${error}`);
    }
  }

  // 2. Check provider status via HTTP (are they still active?)
  const providers = await db.select().from(hostingProviders);
  for (const provider of providers) {
    try {
      const isActive = await checkProviderAvailability(provider.affiliateUrl || '');
      if (!isActive && provider.isActive) {
        await db.update(hostingProviders)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(hostingProviders.id, provider.id));
        details.push(`⚠ Marked ${provider.name} as inactive (affiliate URL unreachable)`);
      }
    } catch (error) {
      // Ignore individual check failures
    }
  }

  // 3. Log sync completion
  console.log(`[Hosting Sync] Complete. Updated: ${updated}, Failed: ${failed}`);
  console.log(details.join('\n'));

  return { updated, failed, details };
}

/**
 * Fetch updates from affiliate networks
 * Extend this with actual API calls to each network
 */
async function fetchAffiliateUpdates(): Promise<ProviderUpdate[]> {
  const updates: ProviderUpdate[] = [];

  // Example: Vercel Partners API
  // const vercelData = await fetch('https://partners.vercel.com/api/commissions').then(r => r.json());
  // updates.push({ slug: 'vercel', updates: { commissionRate: vercelData.rate } });

  // Example: DigitalOcean Referral API
  // const doData = await fetch('https://api.digitalocean.com/v2/customers/my/referrals').then(r => r.json());
  // updates.push({ slug: 'digitalocean', updates: { commissionRate: `$${doData.referral.credit} per signup` } });

  // For now, return empty - add real API integrations as you onboard with each provider
  return updates;
}

/**
 * Check if a provider's affiliate URL is still reachable
 */
async function checkProviderAvailability(url: string): Promise<boolean> {
  if (!url) return false;

  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      const statusCode = res.statusCode || 0;
      resolve(statusCode >= 200 && statusCode < 400);
      res.resume(); // Consume response
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Run if called directly
if (require.main === module) {
  syncHostingProviders()
    .then((result) => {
      console.log('\nSync complete:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Sync failed:', error);
      process.exit(1);
    });
}
