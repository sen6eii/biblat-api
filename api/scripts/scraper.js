// Fix local para redes con proxy/antivirus que intercepta HTTPS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const SUBJECTS = [
  'latin_american_literature',
  'argentine_literature',
  'mexican_literature',
  'colombian_literature',
  'uruguayan_literature',
  'chilean_literature',
  'peruvian_literature'
];

const SUBJECT_LABELS = {
  latin_american_literature: 'Literatura Latinoamericana',
  argentine_literature: 'Literatura Argentina',
  mexican_literature: 'Literatura Mexicana',
  colombian_literature: 'Literatura Colombiana',
  uruguayan_literature: 'Literatura Uruguaya',
  chilean_literature: 'Literatura Chilena',
  peruvian_literature: 'Literatura Peruana'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchSubject = async (subject) => {
  const url = `https://openlibrary.org/subjects/${subject}.json?limit=500`;
  console.log(`Scrapeando: ${url}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} para ${subject}`);

  const json = await res.json();
  return json.works || [];
};

const mapWork = (work, subject) => {
  const author = work.authors?.[0]?.name || null;
  const coverId = work.cover_id || work.cover_edition_key || null;
  const isbn = work.availability?.isbn || null;
  const year = work.first_publish_year || null;

  return {
    title: work.title,
    author,
    year,
    editorial: null,
    category: SUBJECT_LABELS[subject] || subject,
    isbn,
    cover_id: coverId ? String(coverId) : null,
    cover_url: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
    subject,
    ol_key: work.key
  };
};

const upsertBooks = async (books) => {
  const { data, error } = await supabase
    .from('books')
    .upsert(books, { onConflict: 'ol_key', ignoreDuplicates: false });

  if (error) {
    console.error('Error en upsert:', error.message);
    return 0;
  }

  return books.length;
};

const run = async () => {
  console.log('Iniciando scraper de Open Library...\n');
  let total = 0;

  for (const subject of SUBJECTS) {
    try {
      const works = await fetchSubject(subject);
      console.log(`  ${works.length} obras encontradas para ${subject}`);

      const books = works
        .filter(w => w.title && w.authors?.length > 0)
        .map(w => mapWork(w, subject));

      if (books.length > 0) {
        const count = await upsertBooks(books);
        total += count;
        console.log(`  ${count} libros insertados/actualizados\n`);
      }
    } catch (err) {
      console.error(`Error scrapeando ${subject}:`, err.message);
    }

    // Respetar rate limit de Open Library
    await sleep(1000);
  }

  console.log(`\nScraping completado. Total procesados: ${total}`);
};

run().catch(console.error);
