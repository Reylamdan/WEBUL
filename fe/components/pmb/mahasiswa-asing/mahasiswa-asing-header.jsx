export function MahasiswaAsingHeader({ title = "Mahasiswa Asing" }) {
  return (
    <header aria-labelledby="mahasiswa-asing-title" className="mahasiswa-asing-hero">
      <h1 id="mahasiswa-asing-title">{title}</h1>
    </header>
  );
}
