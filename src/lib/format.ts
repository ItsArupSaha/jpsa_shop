/**
 * Shared display formatters. Every amount in the app goes through these so the
 * currency never appears as a mix of ৳ / TK / BDT / $ again.
 *
 * `formatTaka` is for on-screen use (the ৳ glyph renders fine in web fonts).
 * `formatTakaPlain` is for generated PDFs, whose built-in fonts cannot render
 * the ৳ glyph — it uses the ASCII "Tk" instead.
 */

type AmountLike = number | string | undefined | null;

const localeNumber = (amount: AmountLike, opts?: Intl.NumberFormatOptions): string => {
  const value = Number(amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('en-IN', opts);
};

export function formatTaka(amount: AmountLike): string {
  const value = Number(amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safe * 100) / 100;
  const options = Number.isInteger(rounded) ? undefined : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return `৳${localeNumber(rounded, options)}`;
}

export function formatTakaPlain(amount: AmountLike): string {
  const value = Number(amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safe * 100) / 100;
  const options = Number.isInteger(rounded) ? undefined : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return `Tk ${localeNumber(rounded, options)}`;
}

/** Amount without any currency symbol, e.g. table cells that show the symbol in the header. */
export function formatAmount(amount: AmountLike): string {
  const value = Number(amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safe * 100) / 100;
  const options = Number.isInteger(rounded) ? undefined : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return localeNumber(rounded, options);
}
