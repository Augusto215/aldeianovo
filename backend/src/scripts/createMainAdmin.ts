/**
 * Cria (ou promove) o administrador principal do sistema.
 * Rode com: npm run create:admin (idempotente: pode rodar mais de uma vez).
 */
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase.js';

const ADMIN_NAME = 'Gestão';
const ADMIN_EMAIL = 'gestao@apoinme.org';
const ADMIN_PASSWORD = 'gestao26**';

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const { data: existing, error: findError } = await supabase
    .from('User')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { error } = await supabase
      .from('User')
      .update({ role: 'ADMIN', active: true, passwordHash })
      .eq('id', existing.id);
    if (error) throw error;
    console.log(`Usuário ${ADMIN_EMAIL} já existia — atualizado para ADMIN ativo.`);
  } else {
    const { error } = await supabase
      .from('User')
      .insert({ name: ADMIN_NAME, email: ADMIN_EMAIL, role: 'ADMIN', active: true, passwordHash });
    if (error) throw error;
    console.log(`Usuário ${ADMIN_EMAIL} criado como ADMIN.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
