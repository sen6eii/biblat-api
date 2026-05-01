# Biblat — API pública de literatura latinoamericana

## Descripción del proyecto

Biblat es una API REST pública y gratuita de literatura latinoamericana con backoffice de administración. Resuelve la falta de una API de libros en español con foco regional. Los datos provienen de Open Library (openlibrary.org) via scraping automatizado.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Base de datos | Supabase (PostgreSQL) |
| Backend | Node.js + Express |
| Documentación | Swagger UI Express + YAML |
| Rate limiting | express-rate-limit |
| Frontend/Backoffice | HTML + CSS + JS vanilla |
| Deploy API | Railway |
| Deploy Frontend | Vercel |

---

## Estructura de carpetas

```
biblat/
├── CLAUDE.md
├── .env                        # Variables de entorno (nunca commitear)
├── .env.example                # Template de variables
├── .gitignore
├── package.json
│
├── api/
│   ├── index.js                # Entry point del servidor
│   ├── db/
│   │   └── supabase.js         # Cliente de Supabase
│   ├── routes/
│   │   ├── books.js
│   │   ├── authors.js
│   │   └── categories.js
│   ├── controllers/
│   │   ├── books.js
│   │   ├── authors.js
│   │   └── categories.js
│   ├── middleware/
│   │   ├── auth.js             # Validación de API key (futuro)
│   │   └── rateLimit.js        # Rate limiting
│   └── scripts/
│       └── scraper.js          # Scraper de Open Library
│
├── frontend/                   # Backoffice de administración
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
│
└── docs/
    └── swagger.yaml            # Documentación OpenAPI
```

---

## Variables de entorno (.env)

```env
PORT=3000
SUPABASE_URL=tu_supabase_url
SUPABASE_KEY=tu_supabase_anon_key
```

---

## Schema de Supabase

Ejecutar este SQL en el editor de Supabase antes de arrancar:

```sql
create table books (
  id           uuid default gen_random_uuid() primary key,
  title        text not null,
  author       text not null,
  year         integer,
  editorial    text,
  category     text,
  isbn         text,
  cover_id     text,
  cover_url    text,
  subject      text,
  ol_key       text unique,
  created_at   timestamp default now()
);

-- Índices para búsqueda rápida
create index books_title_idx on books using gin(to_tsvector('spanish', title));
create index books_author_idx on books (author);
create index books_category_idx on books (category);
create index books_isbn_idx on books (isbn);
```

---

## Endpoints de la API

```
GET  /                          Health check + info de la API
GET  /docs                      Documentación Swagger interactiva

GET  /v1/books                  Lista de libros (paginado, ?page=1&limit=20)
GET  /v1/books/:id              Un libro por UUID
GET  /v1/books/isbn/:isbn       Buscar por ISBN
GET  /v1/books/search?q=        Búsqueda full-text por título o autor
GET  /v1/books?category=        Filtrar por categoría
GET  /v1/books?author=          Filtrar por autor

GET  /v1/authors                Lista de autores únicos
GET  /v1/categories             Lista de categorías únicas

POST /v1/books                  Crear libro (requiere API key)
PUT  /v1/books/:id              Editar libro (requiere API key)
DELETE /v1/books/:id            Eliminar libro (requiere API key)
```

---

## Fuente de datos — Open Library

El scraper consulta estos subjects de Open Library:

```javascript
const SUBJECTS = [
  'latin_american_literature',
  'argentine_literature',
  'mexican_literature',
  'colombian_literature',
  'uruguayan_literature',
  'chilean_literature',
  'peruvian_literature'
];

// URL base del subject
// https://openlibrary.org/subjects/{subject}.json?limit=500

// URL de portadas
// https://covers.openlibrary.org/b/id/{cover_id}-L.jpg
```

---

## Formato de respuesta de la API

### Lista de libros
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Cien años de soledad",
      "author": "Gabriel García Márquez",
      "year": 1967,
      "editorial": "Sudamericana",
      "category": "Literatura",
      "isbn": "978-84-376-0494-7",
      "cover_url": "https://covers.openlibrary.org/b/id/8739161-L.jpg"
    }
  ],
  "meta": {
    "total": 1284,
    "page": 1,
    "limit": 20,
    "pages": 65
  }
}
```

### Error
```json
{
  "error": "Libro no encontrado",
  "code": 404
}
```

---

## Convenciones de código

- Usar `async/await` siempre, nunca callbacks
- Manejo de errores con `try/catch` en todos los controllers
- Respuestas siempre en formato JSON con estructura `{ data, meta }` o `{ error, code }`
- Variables y funciones en `camelCase`
- Archivos en `kebab-case`
- Comentarios en español
- No usar `var`, solo `const` y `let`

---

## Orden de construcción recomendado

1. Crear estructura de carpetas y `package.json`
2. Configurar Supabase y crear la tabla con el SQL de arriba
3. Correr el scraper para poblar la base de datos
4. Construir `api/index.js` con Express
5. Construir `api/db/supabase.js`
6. Construir controllers y routes de books
7. Construir controllers y routes de authors y categories
8. Agregar rate limiting
9. Escribir `docs/swagger.yaml`
10. Conectar el frontend/backoffice a la API
11. Deploy en Railway (API) + Vercel (frontend)

---

## Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo con hot reload
npm run dev

# Producción
npm start

# Correr el scraper para poblar la base
npm run scrape
```

---

## Notas importantes

- El scraper debe esperar 1000ms entre requests a Open Library para no saturar su servidor
- Las portadas se sirven directamente desde Open Library, no se almacenan localmente
- La API es pública y de solo lectura para usuarios sin API key
- Las operaciones de escritura (POST, PUT, DELETE) requieren API key y son solo para el backoffice
- El backoffice ya tiene diseño finalizado en `frontend/index.html`
- Para el portfolio, con 200-500 libros reales es más que suficiente
