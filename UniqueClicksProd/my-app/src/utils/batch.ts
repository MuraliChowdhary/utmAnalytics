// Batch processing for URL click updates
import postgres from 'postgres';

// Store for batched updates
let clickUpdates = new Map<string, { totalClicks: number, uniqueClicks: number }>();
let updateInProgress = false;

// Schedule batch update to run
export async function scheduleBatchUpdate(sql: ReturnType<typeof postgres>): Promise<void> {
  if (updateInProgress || clickUpdates.size === 0) return;
  
  updateInProgress = true;
  const updates = new Map(clickUpdates);
  clickUpdates.clear();
  
  try {
    // Create a transaction for the batch update
    await sql.begin(async (sql) => {
      for (const [urlId, {totalClicks, uniqueClicks}] of updates) {
        await sql`
          UPDATE "Url"
          SET "totalClicks" = "totalClicks" + ${totalClicks},
              "uniqueClicks" = "uniqueClicks" + ${uniqueClicks},
              "updatedAt" = NOW()
          WHERE id = ${urlId}
        `;
      }
    });
  } catch (error) {
    console.error('Error in batch update:', error);
    // Re-queue failed updates
    for (const [urlId, counts] of updates) {
      if (!clickUpdates.has(urlId)) {
        clickUpdates.set(urlId, counts);
      } else {
        const existing = clickUpdates.get(urlId)!;
        clickUpdates.set(urlId, {
          totalClicks: existing.totalClicks + counts.totalClicks,
          uniqueClicks: existing.uniqueClicks + counts.uniqueClicks
        });
      }
    }
  } finally {
    updateInProgress = false;
    // Check if new updates came in while we were processing
    if (clickUpdates.size > 0) {
      setTimeout(() => scheduleBatchUpdate(sql), 100);
    }
  }
}

// Queue a click update for batch processing
export function queueClickUpdate(urlId: string, isUnique: boolean): void {
  const current = clickUpdates.get(urlId) || { totalClicks: 0, uniqueClicks: 0 };
  
  clickUpdates.set(urlId, {
    totalClicks: current.totalClicks + 1,
    uniqueClicks: current.uniqueClicks + (isUnique ? 1 : 0)
  });
}