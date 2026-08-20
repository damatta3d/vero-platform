import {
  availabilityWeekdays,
  DEFAULT_STORE_TIMEZONE,
  evaluateStoreAvailability,
  type StoreAvailability
} from './store-availability.js';

export type AvailabilityDatabase = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
};

type SettingsRow = {
  now: Date;
  operationallyOpen: boolean;
  timezone: string;
};

type ScheduleRow = {
  closesAt: string | null;
  enabled: boolean;
  opensAt: string | null;
  weekday: number;
};

export async function loadStoreAvailability(
  database: AvailabilityDatabase,
  tenantId: string,
  lock = false
): Promise<StoreAvailability> {
  const lockClause = lock ? ' FOR SHARE' : '';
  const settings = await database.$queryRawUnsafe<SettingsRow[]>(
    `SELECT operationally_open AS "operationallyOpen", timezone, CURRENT_TIMESTAMP AS "now"
       FROM store_settings
      WHERE tenant_id=$1${lockClause}`,
    tenantId
  );
  const row = settings[0];
  if (!row) {
    return evaluateStoreAvailability({
      operationallyOpen: false,
      timezone: DEFAULT_STORE_TIMEZONE,
      schedule: []
    });
  }
  const scheduleRows = await database.$queryRawUnsafe<ScheduleRow[]>(
    `SELECT weekday, enabled,
            CASE WHEN opens_at IS NULL THEN NULL ELSE to_char(opens_at, 'HH24:MI') END AS "opensAt",
            CASE WHEN closes_at IS NULL THEN NULL ELSE to_char(closes_at, 'HH24:MI') END AS "closesAt"
       FROM store_schedule_windows
      WHERE tenant_id=$1 AND sequence=0
      ORDER BY weekday${lockClause}`,
    tenantId
  );
  return evaluateStoreAvailability(
    {
      operationallyOpen: row.operationallyOpen,
      timezone: row.timezone,
      schedule: scheduleRows.flatMap((window) => {
        const weekday = availabilityWeekdays[window.weekday];
        return weekday ? [{ ...window, weekday }] : [];
      })
    },
    new Date(row.now)
  );
}
