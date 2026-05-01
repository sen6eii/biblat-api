const supabase = require('../db/supabase');

const getAuthors = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('author')
      .order('author');

    if (error) throw error;

    // Deduplicar y limpiar
    const authors = [...new Set(data.map(b => b.author).filter(Boolean))].sort();

    res.json({
      data: authors,
      meta: { total: authors.length }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener autores', code: 500 });
  }
};

module.exports = { getAuthors };
