const { z } = require("zod");
const { toPlainText } = require("../utils/sanitizeHtml");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["draft", "published"];
const PLACEMENTS = ["hero", "about", "campus_life"];
const ICONS = ["book", "calendar", "file", "globe", "graduate", "message", "monitor", "sparkle"];
const COLORS = ["coral", "blue", "yellow", "green", "lavender", "orange"];

// Teks polos satu baris, tanpa HTML.
const text = (max, min = 1) =>
  z
    .string({ error: "Teks wajib diisi" })
    .transform(toPlainText)
    .pipe(z.string().min(min, "Teks wajib diisi").max(max, `Maksimal ${max} karakter`));

const optionalText = (max) => text(max, 0);

// Tautan internal ("/profil", "#program") atau https. Skema lain (javascript:, data:) ditolak.
const link = z
  .string({ error: "Tautan wajib diisi" })
  .trim()
  .max(300)
  .refine((v) => /^(\/(?!\/)|#|https?:\/\/)/i.test(v), {
    message: "Tautan harus diawali '/', '#', atau 'https://'",
  });

const idParamsSchema = z.strictObject({
  id: z.string().regex(UUID_PATTERN, "ID tidak valid (harus berupa UUID)"),
});

// ---------- KONTEN TEKS ----------

const heroSchema = z.strictObject({
  imageNote: optionalText(100),
  caption: optionalText(150),
  eyebrow: text(60),
  titleLine1: text(80),
  titleLine2: optionalText(80),
  description: text(400),
  primaryLabel: text(60),
  primaryHref: link,
  secondaryLabel: text(60),
  secondaryHref: link,
});

const aboutSchema = z.strictObject({
  eyebrow: text(60),
  title: text(150),
  lead: text(400),
  values: z
    .array(
      z.strictObject({
        icon: z.enum(ICONS),
        title: text(80),
        description: text(150),
      })
    )
    .max(6),
  linkLabel: text(60),
  linkHref: link,
  mediaLabel: optionalText(100),
  mediaCaption: optionalText(100),
});

const programsSchema = z.strictObject({
  eyebrow: optionalText(60),
  title: text(120),
  lead: optionalText(300),
  linkLabel: text(60),
  linkHref: link,
  items: z
    .array(
      z.strictObject({
        eyebrow: text(80),
        title: text(100),
        code: text(60),
        color: z.enum(COLORS),
        href: link,
      })
    )
    .max(12),
});

const campusLifeSchema = z.strictObject({
  eyebrow: text(60),
  title: text(150),
  description: text(400),
  linkLabel: text(60),
  linkHref: link,
  photoLabel: optionalText(60),
});

const admissionSchema = z.strictObject({
  eyebrow: text(60),
  title: text(150),
  description: text(400),
  primaryLabel: text(60),
  primaryHref: link,
  secondaryLabel: text(80),
  secondaryHref: link,
});

const quickLinksSchema = z
  .array(
    z.strictObject({
      name: text(40),
      detail: text(80),
      icon: z.enum(ICONS),
      href: link,
    })
  )
  .max(8);

const partnersSchema = z.strictObject({
  title: text(80),
  items: z.array(text(60)).max(24),
});

const CONTENT_SCHEMAS = {
  hero: heroSchema,
  about: aboutSchema,
  programs: programsSchema,
  campusLife: campusLifeSchema,
  admission: admissionSchema,
  quickLinks: quickLinksSchema,
  partners: partnersSchema,
};

// Boleh mengirim sebagian section; section yang dikirim menggantikan section lama secara utuh.
const updateContentSchema = z
  .strictObject(
    Object.fromEntries(
      Object.entries(CONTENT_SCHEMAS).map(([key, schema]) => [key, schema.optional()])
    )
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu section harus dikirim",
  });

// ---------- FOTO ----------

const sortOrder = z.coerce.number().int().min(0).max(9999);

const listPhotosQuerySchema = z.strictObject({
  placement: z.enum(PLACEMENTS).optional(),
  status: z.enum(STATUSES).optional(),
});

const createPhotoSchema = z.strictObject({
  placement: z.enum(PLACEMENTS),
  title: text(150),
  caption: optionalText(300).default(""),
  sortOrder: sortOrder.default(0),
  status: z.enum(STATUSES).default("draft"),
});

const updatePhotoSchema = z
  .strictObject({
    placement: z.enum(PLACEMENTS).optional(),
    title: text(150).optional(),
    caption: optionalText(300).optional(),
    sortOrder: sortOrder.optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Minimal satu data harus diperbarui" });

// ---------- VIDEO ----------

const listVideosQuerySchema = z.strictObject({
  status: z.enum(STATUSES).optional(),
});

const createVideoSchema = z.strictObject({
  title: text(150),
  description: optionalText(500).default(""),
  sortOrder: sortOrder.default(0),
  status: z.enum(STATUSES).default("draft"),
});

const updateVideoSchema = z
  .strictObject({
    title: text(150).optional(),
    description: optionalText(500).optional(),
    sortOrder: sortOrder.optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Minimal satu data harus diperbarui" });

module.exports = {
  CONTENT_SCHEMAS,
  idParamsSchema,
  updateContentSchema,
  listPhotosQuerySchema,
  createPhotoSchema,
  updatePhotoSchema,
  listVideosQuerySchema,
  createVideoSchema,
  updateVideoSchema,
};
