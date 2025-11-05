import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadLogo() {
  try {
    const logoPath = join(process.cwd(), 'public', 'Althea-Logo-Green.jpg');
    const fileBuffer = readFileSync(logoPath);

    console.log('Uploading logo to Supabase Storage...');
    console.log('File size:', fileBuffer.length, 'bytes');

    // Try to create bucket first (ignore if exists)
    await supabase.storage.createBucket('public-assets', {
      public: true,
      fileSizeLimit: 5242880
    }).catch(() => console.log('Bucket already exists'));

    // Upload the logo
    const { data, error } = await supabase.storage
      .from('public-assets')
      .upload('althea-logo.jpg', fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl('althea-logo.jpg');

    console.log('Logo uploaded successfully!');
    console.log('Public URL:', urlData.publicUrl);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

uploadLogo();
