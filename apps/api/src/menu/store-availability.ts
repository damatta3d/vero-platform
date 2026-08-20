export const DEFAULT_STORE_TIMEZONE = 'America/Campo_Grande';

export const availabilityWeekdays = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
] as const;

export type AvailabilityWeekday = (typeof availabilityWeekdays)[number];
export type AvailabilityReason = 'OPEN' | 'MANUALLY_CLOSED' | 'OUTSIDE_SCHEDULE';

export type StoreAvailabilityInput = {
  operationallyOpen: boolean;
  timezone: string;
  schedule: ReadonlyArray<{
    weekday: AvailabilityWeekday;
    enabled: boolean;
    opensAt: string | null;
    closesAt: string | null;
  }>;
};

export type StoreAvailability = {
  canAcceptOrders: boolean;
  nextOpening: string | null;
  reason: AvailabilityReason;
  statusMessage: string;
  timezone: string;
};

const weekdayFromIntl: Record<string, AvailabilityWeekday> = {
  Monday: 'MONDAY',
  Tuesday: 'TUESDAY',
  Wednesday: 'WEDNESDAY',
  Thursday: 'THURSDAY',
  Friday: 'FRIDAY',
  Saturday: 'SATURDAY',
  Sunday: 'SUNDAY'
};

const weekdayLabels: Record<AvailabilityWeekday, string> = {
  MONDAY: 'segunda-feira',
  TUESDAY: 'terça-feira',
  WEDNESDAY: 'quarta-feira',
  THURSDAY: 'quinta-feira',
  FRIDAY: 'sexta-feira',
  SATURDAY: 'sábado',
  SUNDAY: 'domingo'
};

function minutes(value: string | null): number | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  if (hour === undefined || minute === undefined || hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function localTime(
  now: Date,
  timezone: string
): { minuteOfDay: number; weekday: AvailabilityWeekday } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = weekdayFromIntl[values['weekday'] ?? ''];
  const hour = Number(values['hour']);
  const minute = Number(values['minute']);
  if (!weekday || !Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error('INVALID_STORE_TIMEZONE');
  }
  return { weekday, minuteOfDay: hour * 60 + minute };
}

function nextOpening(
  schedule: StoreAvailabilityInput['schedule'],
  weekday: AvailabilityWeekday,
  minuteOfDay: number
): string | null {
  const today = availabilityWeekdays.indexOf(weekday);
  for (let offset = 0; offset <= availabilityWeekdays.length; offset += 1) {
    const candidateWeekday = availabilityWeekdays[(today + offset) % availabilityWeekdays.length]!;
    const window = schedule.find((day) => day.weekday === candidateWeekday);
    const opens = minutes(window?.opensAt ?? null);
    const closes = minutes(window?.closesAt ?? null);
    if (!window?.enabled || opens === null || closes === null || opens >= closes) continue;
    if (offset === 0 && minuteOfDay >= opens) continue;
    const dayLabel =
      offset === 0 ? 'hoje' : offset === 1 ? 'amanhã' : weekdayLabels[candidateWeekday];
    return `Abre ${dayLabel} às ${window.opensAt}`;
  }
  return null;
}

export function isValidStoreTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function evaluateStoreAvailability(
  input: StoreAvailabilityInput,
  now = new Date()
): StoreAvailability {
  if (!input.operationallyOpen) {
    return {
      canAcceptOrders: false,
      nextOpening: null,
      reason: 'MANUALLY_CLOSED',
      statusMessage: 'Loja temporariamente fechada',
      timezone: input.timezone
    };
  }

  let current: ReturnType<typeof localTime>;
  try {
    current = localTime(now, input.timezone);
  } catch {
    return {
      canAcceptOrders: false,
      nextOpening: null,
      reason: 'OUTSIDE_SCHEDULE',
      statusMessage: 'Fechado agora · Horário indisponível',
      timezone: input.timezone
    };
  }

  const window = input.schedule.find((day) => day.weekday === current.weekday);
  const opens = minutes(window?.opensAt ?? null);
  const closes = minutes(window?.closesAt ?? null);
  const withinSchedule =
    window?.enabled === true &&
    opens !== null &&
    closes !== null &&
    opens < closes &&
    current.minuteOfDay >= opens &&
    current.minuteOfDay < closes;
  if (withinSchedule) {
    return {
      canAcceptOrders: true,
      nextOpening: null,
      reason: 'OPEN',
      statusMessage: '● Aberto agora',
      timezone: input.timezone
    };
  }

  const next = nextOpening(input.schedule, current.weekday, current.minuteOfDay);
  return {
    canAcceptOrders: false,
    nextOpening: next,
    reason: 'OUTSIDE_SCHEDULE',
    statusMessage: next ? `Fechado agora · ${next}` : 'Fechado agora · Horário não disponível',
    timezone: input.timezone
  };
}
