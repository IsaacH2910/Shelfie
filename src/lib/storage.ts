import { supabase } from '@/lib/supabase'

/** Upload a captured cover image to the public "covers" bucket. */
export async function uploadCover(
  file: Blob,
  userId: string,
): Promise<string> {
  const ext = file.type.includes('png') ? 'png' : 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('covers').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('covers').getPublicUrl(path)
  return data.publicUrl
}
