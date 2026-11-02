// Membuat admin secara manual dari terminal.
// Jalankan dari folder be:   npm run seed:admin
// Password diketik tersembunyi dan TIDAK disimpan di riwayat terminal. Hanya hash bcrypt yang disimpan.

require("../src/config/env"); // memuat .env dan memvalidasi variabel wajib
const supabase = require("../src/config/supabase");
const { createAdminSchema } = require("../src/validators/authValidator");
const { hashPassword } = require("../src/utils/password");

const readAllStdin = () =>
  new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });

// Membaca satu baris dari terminal interaktif. Jika hidden=true, karakter tidak ditampilkan.
const readLine = (question, hidden) =>
  new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    let input = "";

    const finish = (callback, value) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      callback(value);
    };

    const onData = (chunk) => {
      const text = chunk.toString("utf8");
      if (text.startsWith("\u001b")) return; // abaikan tombol panah dan tombol fungsi

      for (const char of text) {
        if (char === "\r" || char === "\n") return finish(resolve, input);
        if (char === "\u0003") return finish(reject, new Error("Dibatalkan oleh pengguna."));
        if (char === "\u007f" || char === "\b") {
          if (input.length > 0) {
            input = [...input].slice(0, -1).join("");
            if (!hidden) stdout.write("\b \b");
          }
          continue;
        }
        if (char < " ") continue; // abaikan karakter kontrol lain
        input += char;
        if (!hidden) stdout.write(char);
      }
    };

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });

// Terminal interaktif: password disembunyikan.
// Input dari pipe (bukan terminal): dibaca per baris, password TIDAK disembunyikan.
const createPrompter = async () => {
  if (!process.stdin.isTTY) {
    const lines = (await readAllStdin()).split(/\r?\n/);
    const next = async (question) => {
      process.stdout.write(`${question}\n`);
      return lines.shift() ?? "";
    };
    return { ask: next, askHidden: next };
  }
  return {
    ask: (question) => readLine(question, false),
    askHidden: (question) => readLine(question, true),
  };
};

const fail = (message) => {
  console.error(`\nGAGAL: ${message}`);
  process.exit(1);
};

const main = async () => {
  const prompt = await createPrompter();

  console.log("=== Buat admin Universitas LIA ===");
  console.log("(password tidak akan tampil saat diketik)\n");
  const name = await prompt.ask("Nama               : ");
  const email = await prompt.ask("Email              : ");
  const password = await prompt.askHidden("Password           : ");
  const confirmation = await prompt.askHidden("Ulangi password    : ");

  if (password !== confirmation) {
    fail("Password dan konfirmasi tidak sama.");
  }

  const parsed = createAdminSchema.safeParse({ name, email, password });
  if (!parsed.success) {
    console.error("\nGAGAL: data tidak valid:");
    for (const issue of parsed.error.issues) {
      console.error(` - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const { data, error } = await supabase
    .from("admins")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      password_hash: passwordHash,
    })
    .select("id, name, email, is_active, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      fail("Email tersebut sudah terdaftar sebagai admin.");
    }
    if (error.code === "42P01" || error.code === "PGRST205") {
      fail("Tabel admins belum ada. Jalankan dulu SQL pembuatan tabel di Supabase SQL Editor.");
    }
    fail(`Gagal menyimpan admin ke database (${error.code || "tanpa kode"}): ${error.message}`);
  }

  console.log("\nAdmin berhasil dibuat:");
  console.log(` ID     : ${data.id}`);
  console.log(` Nama   : ${data.name}`);
  console.log(` Email  : ${data.email}`);
  console.log(` Aktif  : ${data.is_active}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => fail(error.message));