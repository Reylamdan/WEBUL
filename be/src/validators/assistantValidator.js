
const { z } = require("zod");

const MAX_QUESTION_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_CONTENT_LENGTH = 2000;

const chatAssistantSchema = z.strictObject(
  {
    question: z
      .string({ error: "Pertanyaan harus berupa teks" })
      .trim()
      .min(1, "Pertanyaan tidak boleh kosong")
      .max(
        MAX_QUESTION_LENGTH,
        `Pertanyaan maksimal ${MAX_QUESTION_LENGTH} karakter`
      ),

    history: z
      .array(
        z.strictObject({
          role: z.enum(["user", "assistant"], {
            error: "Role riwayat harus user atau assistant",
          }),

          content: z
            .string({ error: "Isi riwayat harus berupa teks" })
            .trim()
            .min(1, "Isi riwayat tidak boleh kosong")
            .max(
              MAX_HISTORY_CONTENT_LENGTH,
              `Isi riwayat maksimal ${MAX_HISTORY_CONTENT_LENGTH} karakter`
            ),
        })
      )
      .max(
        MAX_HISTORY_MESSAGES,
        `Riwayat percakapan maksimal ${MAX_HISTORY_MESSAGES} pesan`
      )
      .optional()
      .default([]),
  },
  {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Field tidak dikenal atau tidak boleh dikirim: ${issue.keys.join(", ")}`
        : undefined,
  }
);

module.exports = {
  chatAssistantSchema,
};
