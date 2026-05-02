const ANGOLA_TIME_ZONE = 'Africa/Luanda';

type DateTimeValue = string | Date;

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  timeZone: ANGOLA_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

export function formatTime(dateTime: DateTimeValue): string {
  return new Date(dateTime).toLocaleTimeString('pt-AO', {
    timeZone: ANGOLA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeWithSeconds(dateTime: DateTimeValue): string {
  return new Date(dateTime).toLocaleTimeString('pt-AO', {
    timeZone: ANGOLA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDateTime(dateTime: DateTimeValue): string {
  return new Date(dateTime).toLocaleString('pt-AO', dateTimeOptions);
}

export function formatDateTimeWithSeconds(dateTime: DateTimeValue): string {
  return new Date(dateTime).toLocaleString('pt-AO', {
    ...dateTimeOptions,
    second: '2-digit',
  });
}

export function formatDate(dateTime: DateTimeValue): string {
  return new Date(dateTime).toLocaleDateString('pt-AO', {
    timeZone: ANGOLA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatMonthName(dateTime: DateTimeValue): string {
  return new Date(dateTime).toLocaleString('pt-AO', {
    timeZone: ANGOLA_TIME_ZONE,
    month: 'long',
  });
}

export function formatMonthYear(dateTime: DateTimeValue): string {
  return new Date(dateTime).toLocaleString('pt-AO', {
    timeZone: ANGOLA_TIME_ZONE,
    month: 'short',
    year: 'numeric',
  });
}

export function formatTimestampLabel(): string {
  return new Date().toLocaleString('pt-AO', dateTimeOptions);
}
