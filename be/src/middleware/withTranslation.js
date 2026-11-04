const { overlayPublicItems, ENTITIES, SUPPORTED_LANGS } = require("../services/translationStore");

// Middleware untuk endpoint PUBLIK (berita/pengumuman): bila ada ?lang=en, isi respons JSON
// digabung dengan terjemahan yang sudah disetujui admin. Tanpa ?lang (atau lang=id, atau
// bahasa lain yang tidak didukung) perilaku endpoint TIDAK berubah sama sekali.
// Jika penggabungan gagal karena alasan apa pun, pengunjung tetap menerima versi Indonesia.
//
// Controller yang sudah jadi tidak diubah: middleware ini membungkus res.json.
const withTranslation = (kind) => {
  const { itemKey } = ENTITIES[kind];

  return (req, res, next) => {
    const lang = typeof req.query.lang === "string" ? req.query.lang.toLowerCase() : "";
    if (!SUPPORTED_LANGS.includes(lang)) return next();

    const sendOriginal = res.json.bind(res);

    res.json = (body) => {
      // Hanya respons sukses yang berisi data berita/pengumuman yang diolah.
      const data = body && body.success && body.data;
      const hasList = data && Array.isArray(data.items);
      const hasOne = data && data[itemKey] && typeof data[itemKey] === "object";
      if (res.statusCode !== 200 || (!hasList && !hasOne)) return sendOriginal(body);

      const items = hasList ? data.items : [data[itemKey]];
      overlayPublicItems(kind, lang, items)
        .then((translated) => {
          const nextData = { ...data, lang };
          if (hasList) nextData.items = translated;
          else nextData[itemKey] = translated[0];
          sendOriginal({ ...body, data: nextData });
        })
        .catch((error) => {
          console.error(`[TRANSLATION] gabung terjemahan gagal, memakai Indonesia: ${error.message}`);
          sendOriginal(body);
        });
      return res;
    };

    return next();
  };
};

module.exports = withTranslation;
