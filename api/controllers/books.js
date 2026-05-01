const supabase = require('../db/supabase');

const getBooks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const { category, author } = req.query;

    let query = supabase.from('books').select('*', { count: 'exact' });

    if (category) query = query.ilike('category', `%${category}%`);
    if (author) query = query.ilike('author', `%${author}%`);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      data,
      meta: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener libros', code: 500 });
  }
};

const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el libro', code: 500 });
  }
};

const getBookByIsbn = async (req, res) => {
  try {
    const { isbn } = req.params;
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('isbn', isbn)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Error al buscar por ISBN', code: 500 });
  }
};

const searchBooks = async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Parámetro q requerido (mínimo 2 caracteres)', code: 400 });
    }

    const { data, error, count } = await supabase
      .from('books')
      .select('*', { count: 'exact' })
      .or(`title.ilike.%${q}%,author.ilike.%${q}%`)
      .order('title')
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      data,
      meta: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
        query: q
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en la búsqueda', code: 500 });
  }
};

const createBook = async (req, res) => {
  try {
    const { title, author, year, editorial, category, isbn, cover_url, subject } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'Título y autor son requeridos', code: 400 });
    }

    const { data, error } = await supabase
      .from('books')
      .insert([{ title, author, year, editorial, category, isbn, cover_url, subject }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear el libro', code: 500 });
  }
};

const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('books')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el libro', code: 500 });
  }
};

const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('books').delete().eq('id', id);

    if (error) throw error;

    res.json({ data: { message: 'Libro eliminado correctamente' } });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el libro', code: 500 });
  }
};

module.exports = { getBooks, getBookById, getBookByIsbn, searchBooks, createBook, updateBook, deleteBook };
