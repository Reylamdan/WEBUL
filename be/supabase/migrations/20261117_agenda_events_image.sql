-- Gambar acara bersifat opsional: kolom boleh NULL (acara tanpa gambar tetap valid).
-- Path objek di bucket Storage "news-images" (prefix "agenda/<id>/").
ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS image_path text;
