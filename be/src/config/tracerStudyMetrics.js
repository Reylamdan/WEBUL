'use strict';

/**
 * Definisi metrik Tracer Study yang ditampilkan di halaman publik.
 *
 * Menambah grafik baru = menambah satu objek di array ini (tanpa migrasi DB),
 * selama kolom pertanyaannya sudah ada di tracer_study_responses.answers.
 *
 * Tipe metrik:
 *  - 'categories' : nilai jawaban dipetakan ke kategori (cocok untuk donut/pie)
 *  - 'ranges'     : nilai angka dikelompokkan ke rentang + rata-rata (cocok untuk bar)
 *
 * Catatan: `key` dan tiap `items[].key` bersifat stabil supaya frontend bisa
 * menerjemahkan label lewat dictionary i18n tanpa bergantung pada teks label.
 */

const JUTA = 1000000;

const TRACER_STUDY_METRICS = [
  {
    key: 'f8',
    code: 'F8',
    title: 'Status Alumni Saat Ini',
    type: 'categories',
    chart: 'donut',
    field: 'f8',
    categories: [
      { key: 'bekerja', label: 'Bekerja (penuh waktu/paruh waktu)', values: [1] },
      {
        key: 'belum-memungkinkan-bekerja',
        label: 'Belum memungkinkan bekerja (sakit, mengurus keluarga, dan/atau alasan lainnya)',
        values: [2],
      },
      { key: 'melanjutkan-pendidikan', label: 'Melanjutkan pendidikan', values: [4] },
      {
        key: 'mencari-pekerjaan',
        label: 'Tidak bekerja tetapi sedang mencari pekerjaan',
        values: [5],
      },
      { key: 'wiraswasta', label: 'Wiraswasta/wirausaha/pekerja lepas', values: [3] },
    ],
  },
  {
    key: 'f14',
    code: 'F14',
    title: 'Keselarasan Horizontal — Pekerjaan',
    type: 'categories',
    chart: 'donut',
    field: 'f14',
    // Hanya alumni yang bekerja (F8 = 1), sama seperti halaman lama.
    filter: { field: 'f8', equals: 1 },
    categories: [
      // ASUMSI: skala 1-5 (1 = sangat erat ... 5 = tidak sama sekali).
      // Cocokkan dengan rumus "V2" di sistem lama sebelum dipakai produksi.
      { key: 'selaras', label: 'Selaras', values: [1, 2, 3] },
      { key: 'tidak-selaras', label: 'Tidak Selaras', values: [4, 5] },
    ],
  },
  {
    key: 'f502',
    code: 'F502',
    title: 'Waktu Mendapatkan Pekerjaan',
    type: 'ranges',
    chart: 'bar',
    field: 'f502',
    unit: 'bulan',
    // Rentang SALING LEPAS (tidak tumpang tindih) supaya total = jumlah responden.
    bins: [
      { key: 'sebelum-lulus', label: 'Sebelum lulus', test: (v) => v < 0 },
      { key: '0-6-bulan', label: '0–6 bulan', test: (v) => v >= 0 && v <= 6 },
      { key: '7-12-bulan', label: '7–12 bulan', test: (v) => v > 6 && v <= 12 },
      { key: 'lebih-12-bulan', label: 'Lebih dari 12 bulan', test: (v) => v > 12 },
    ],
  },
  {
    key: 'f505',
    code: 'F505',
    title: 'Take Home Pay',
    type: 'ranges',
    chart: 'bar',
    field: 'f505',
    unit: 'IDR',
    // Batas atas inklusif: "s.d. Rp1.500.000" termasuk Rp1.500.000.
    bins: [
      { key: 'sd-1-5jt', label: 's.d. Rp1.500.000', test: (v) => v <= 1.5 * JUTA },
      {
        key: '1-5-2-5jt',
        label: 'Rp1.500.000 - Rp2.500.000',
        test: (v) => v > 1.5 * JUTA && v <= 2.5 * JUTA,
      },
      {
        key: '2-5-5jt',
        label: 'Rp2.500.000 - Rp5.000.000',
        test: (v) => v > 2.5 * JUTA && v <= 5 * JUTA,
      },
      {
        key: '5-10jt',
        label: 'Rp5.000.000 - Rp10.000.000',
        test: (v) => v > 5 * JUTA && v <= 10 * JUTA,
      },
      {
        key: '10-20jt',
        label: 'Rp10.000.000 - Rp20.000.000',
        test: (v) => v > 10 * JUTA && v <= 20 * JUTA,
      },
      { key: 'di-atas-20jt', label: 'Di atas Rp20.000.000', test: (v) => v > 20 * JUTA },
    ],
  },
];

module.exports = { TRACER_STUDY_METRICS };