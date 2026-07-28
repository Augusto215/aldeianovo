/**
 * Cria o bucket privado de Storage para anexos de dossiê (contrato, nota
 * fiscal, comprovante). Rode com: npm run create:bucket (idempotente).
 */
import { supabase } from '../lib/supabase.js';

const BUCKET = 'dossies';

async function main() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" já existe.`);
    return;
  }

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: '10MB',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
  });
  if (error) throw error;
  console.log(`Bucket "${BUCKET}" criado (privado, até 10MB, imagem/PDF).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
