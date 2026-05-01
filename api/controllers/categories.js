const supabase = require('../db/supabase');

const getCategories = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('category')
      .order('category');

    if (error) throw error;

    const categories = [...new Set(data.map(b => b.category).filter(Boolean))].sort();

    res.json({
      data: categories,
      meta: { total: categories.length }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías', code: 500 });
  }
};

module.exports = { getCategories };
