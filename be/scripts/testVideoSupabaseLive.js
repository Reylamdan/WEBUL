
const crypto = require("node:crypto");
const supabase = require("../src/config/supabase");

const testId = crypto.randomUUID();
const recordId = crypto.randomUUID();
const publicId = `universitas-lia-test/db-check/${testId}`;

let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`  OK    ${name}`);
  } catch (error) {
    failed++;
    console.error(`  GAGAL ${name}:`, error.message);
  }
};

(async () => {
  console.log("=== TES LIVE SUPABASE VIDEO ===");
  console.log("ID pengujian:", testId);

  try {
    await test("Insert metadata video", async () => {
      const { error } = await supabase.from("media_videos").insert({
        owner_module: "news",
        record_id: recordId,
        public_id: publicId,
        secure_url: "https://example.com/test.mp4",
        thumbnail_url: "https://example.com/test.jpg",
        resource_type: "video",
        format: "mp4",
        bytes: 1024,
        duration: 5,
        width: 640,
        height: 360,
        status: "active",
        uploaded_by: null,
      });

      if (error) throw error;
    });

    await test("Baca kembali metadata video", async () => {
      const { data, error } = await supabase
        .from("media_videos")
        .select("*")
        .eq("public_id", publicId)
        .single();

      if (error) throw error;
      if (!data || data.record_id !== recordId) {
        throw new Error("Metadata tidak sesuai");
      }
    });

    await test("Update status metadata video", async () => {
      const { data, error } = await supabase
        .from("media_videos")
        .update({ status: "archived" })
        .eq("public_id", publicId)
        .select("id, status")
        .single();

      if (error) throw error;
      if (data.status !== "archived") {
        throw new Error("Status tidak berubah");
      }
    });

    await test("Insert antrean cleanup", async () => {
      const { error } = await supabase
        .from("media_cleanup_queue")
        .insert({
          public_id: publicId,
          resource_type: "video",
          reason: "Pengujian integrasi Supabase",
          last_error: "Simulasi kegagalan destroy",
        });

      if (error) throw error;
    });

    await test("Baca antrean cleanup", async () => {
      const { data, error } = await supabase
        .from("media_cleanup_queue")
        .select("*")
        .eq("public_id", publicId)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Data antrean tidak ditemukan");
    });
  } finally {
    console.log("\nMembersihkan data pengujian...");

    const queueCleanup = await supabase
      .from("media_cleanup_queue")
      .delete()
      .eq("public_id", publicId);

    const videoCleanup = await supabase
      .from("media_videos")
      .delete()
      .eq("public_id", publicId);

    if (queueCleanup.error) {
      console.error("Gagal membersihkan antrean:", queueCleanup.error.message);
    }

    if (videoCleanup.error) {
      console.error("Gagal membersihkan metadata:", videoCleanup.error.message);
    }

    console.log("\n=== HASIL TES SUPABASE LIVE ===");
    console.log(`${passed} lulus, ${failed} gagal`);

    if (queueCleanup.error || videoCleanup.error || failed > 0) {
      process.exitCode = 1;
    }
  }
})();
