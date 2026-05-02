// Fix local para redes con proxy/antivirus que intercepta HTTPS
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

const limiter = require('./middleware/rateLimit');
const booksRouter = require('./routes/books');
const authorsRouter = require('./routes/authors');
const categoriesRouter = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(limiter);
app.use('/backoffice', express.static(path.join(__dirname, '../frontend')));

// Documentación Swagger
const swaggerDoc = yaml.load(fs.readFileSync(path.join(__dirname, '../docs/swagger.yaml'), 'utf8'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'Biblat API',
    description: 'API pública de literatura latinoamericana',
    version: '1.0.0',
    docs: '/docs',
    endpoints: {
      books: '/v1/books',
      authors: '/v1/authors',
      categories: '/v1/categories'
    }
  });
});

// Debug endpoint para verificar conexión a Supabase
app.get('/health', async (req, res) => {
  const env = {
    supabase_url: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.slice(0, 30) + '...' : 'MISSING',
    supabase_key: process.env.SUPABASE_KEY ? 'SET' : 'MISSING',
    node_env: process.env.NODE_ENV || 'undefined'
  };

  // Test raw fetch a Supabase REST
  try {
    const rawRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/books?select=id&limit=1`, {
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`
      }
    });
    const rawBody = await rawRes.text();
    return res.json({ status: rawRes.status, body: rawBody.slice(0, 300), env });
  } catch (e) {
    return res.status(500).json({ fetch_error: e.message, cause: e.cause?.message, env });
  }
});

// Rutas v1
app.use('/v1/books', booksRouter);
app.use('/v1/authors', authorsRouter);
app.use('/v1/categories', categoriesRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', code: 404 });
});

app.listen(PORT, () => {
  console.log(`Biblat API corriendo en http://localhost:${PORT}`);
  console.log(`Documentación: http://localhost:${PORT}/docs`);
});

module.exports = app;
