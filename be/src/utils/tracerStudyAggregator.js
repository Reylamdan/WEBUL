'use strict';

const { TRACER_STUDY_METRICS } = require('../config/tracerStudyMetrics');

/** Ubah jawaban mentah menjadi angka; null jika kosong / bukan angka. */
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function percentage(count, total) {
  return total > 0 ? round2((count / total) * 100) : 0;
}

function getAnswer(row, field) {
  const answers = row && row.answers;
  return answers && typeof answers === 'object' ? answers[field] : undefined;
}

function matchesFilter(row, filter) {
  if (!filter) return true;
  return toNumber(getAnswer(row, filter.field)) === filter.equals;
}

function buildCategoriesMetric(metric, base) {
  const counts = new Map(metric.categories.map((c) => [c.key, 0]));
  let answered = 0;

  for (const row of base) {
    const value = toNumber(getAnswer(row, metric.field));
    if (value === null) continue;
    const category = metric.categories.find((c) => c.values.includes(value));
    if (!category) continue;
    counts.set(category.key, counts.get(category.key) + 1);
    answered += 1;
  }

  return {
    answered,
    items: metric.categories.map((c) => ({
      key: c.key,
      label: c.label,
      count: counts.get(c.key),
      percentage: percentage(counts.get(c.key), answered),
    })),
  };
}

function buildRangesMetric(metric, base) {
  const counts = new Map(metric.bins.map((b) => [b.key, 0]));
  let answered = 0;
  let sum = 0;

  for (const row of base) {
    const value = toNumber(getAnswer(row, metric.field));
    if (value === null) continue;
    const bin = metric.bins.find((b) => b.test(value));
    if (!bin) continue;
    counts.set(bin.key, counts.get(bin.key) + 1);
    answered += 1;
    sum += value;
  }

  return {
    answered,
    average: answered > 0 ? round2(sum / answered) : null,
    items: metric.bins.map((b) => ({
      key: b.key,
      label: b.label,
      count: counts.get(b.key),
      percentage: percentage(counts.get(b.key), answered),
    })),
  };
}

function buildMetric(metric, rows) {
  const base = rows.filter((row) => matchesFilter(row, metric.filter));
  const computed =
    metric.type === 'ranges' ? buildRangesMetric(metric, base) : buildCategoriesMetric(metric, base);

  const result = {
    key: metric.key,
    code: metric.code,
    title: metric.title,
    type: metric.type,
    chart: metric.chart,
    totalRespondents: base.length,
    answered: computed.answered,
    unanswered: base.length - computed.answered,
    items: computed.items,
  };

  if (metric.unit) result.unit = metric.unit;
  if (metric.filter) result.filter = { field: metric.filter.field, equals: metric.filter.equals };
  if (metric.type === 'ranges') result.average = computed.average;

  return result;
}

/**
 * @param {Array<{answers: object}>} rows   baris tracer_study_responses
 * @param {{ metrics?: Array, metricKeys?: string[] }} [options]
 */
function buildTracerStudySummary(rows, options = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  let metrics = options.metrics || TRACER_STUDY_METRICS;
  if (Array.isArray(options.metricKeys) && options.metricKeys.length > 0) {
    metrics = metrics.filter((m) => options.metricKeys.includes(m.key));
  }

  return {
    totalRespondents: safeRows.length,
    metrics: metrics.map((metric) => buildMetric(metric, safeRows)),
  };
}

module.exports = { buildTracerStudySummary, buildMetric, toNumber };