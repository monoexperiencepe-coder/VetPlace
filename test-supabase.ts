import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
  console.log('')

  // Test 1: listar tablas visibles para PostgREST
  console.log('--- Test 1: SELECT en clients ---')
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .limit(1)

  if (error) {
    console.error('ERROR:', JSON.stringify(error, null, 2))
  } else {
    console.log('OK. Filas encontradas:', data?.length ?? 0)
  }

  // Test 2: intentar insert
  console.log('')
  console.log('--- Test 2: INSERT en clients ---')
  const { data: inserted, error: insertError } = await supabase
    .from('clients')
    .insert({ phone: '+51999999999', name: 'Test' })
    .select()
    .single()

  if (insertError) {
    console.error('ERROR:', JSON.stringify(insertError, null, 2))
  } else {
    console.log('OK. Insertado:', inserted)

    // Limpiar
    await supabase.from('clients').delete().eq('id', inserted.id)
    console.log('(registro de prueba eliminado)')
  }
}

main()
