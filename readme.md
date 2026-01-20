# GreenNewsTracker

A modern, full-stack news tracking application focused on green and sustainable news. Built with TypeScript, React, Node.js, and Docker.

## 🌟 Features

- **Real-time News Aggregation**: Automatically fetches and categorizes green news from multiple RSS sources
- **AI-Powered Classification**: Uses OpenAI GPT to classify articles by sustainability topics
- **Country-Based Filtering**: Filter news by country and region
- **Responsive Design**: Modern, mobile-friendly UI built with React and Vite
- **RESTful API**: Clean, well-documented API with caching and rate limiting
- **Docker Support**: Fully containerized deployment with multi-stage builds
- **Health Monitoring**: Built-in health checks for all services

## 🏗️ Architecture

```
greennewstracker/
├── backend/
│   ├── api/          # Express API server
│   ├── worker/       # Background worker for RSS fetching
│   └── shared/       # Shared utilities and types
├── frontend/         # React + Vite application
├── docker/           # Nginx proxy configuration
├── config/           # RSS sources configuration
└── scripts/          # Setup and deployment scripts
```

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (for local development)
- OpenAI API key (for AI classification)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd greennewstracker
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set the following required variables:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Database
   DB_PATH=/app/data/greennews.db

   # API Configuration
   API_PORT=3000
   API_HOST=0.0.0.0
   CORS_ORIGIN=*

   # Worker Configuration
   WORKER_CRON_SCHEDULE=*/15 * * * *
   RSS_FETCH_INTERVAL_MINUTES=15
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost
   - API: http://localhost/api
   - API Health: http://localhost/api/health

### Using the Setup Script

For automated setup, run:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

## 📦 Services

### Frontend
- **Technology**: React 18, TypeScript, Vite
- **Port**: 80 (via proxy)
- **Features**:
  - News listing with pagination
  - Country-based filtering
  - Article detail view
  - Responsive design

### API
- **Technology**: Express, TypeScript
- **Port**: 3000 (internal)
- **Endpoints**:
  - `GET /api/health` - Health check
  - `GET /api/news` - Get news articles
  - `GET /api/news/:id` - Get article by ID
  - `GET /api/countries` - Get available countries
- **Features**:
  - Response caching
  - Rate limiting
  - Error handling
  - Request validation

### Worker
- **Technology**: Node.js, TypeScript
- **Features**:
  - Scheduled RSS fetching
  - Article deduplication
  - AI-powered classification
  - Automatic retry on failure

### Proxy
- **Technology**: Nginx
- **Port**: 80, 443
- **Features**:
  - Reverse proxy
  - Static file serving
  - Gzip compression
  - Security headers

## 🔧 Development

### Local Development Setup

1. **Install dependencies**
   ```bash
   # Backend
   cd backend/api && npm install
   cd ../worker && npm install
   cd ../shared && npm install

   # Frontend
   cd ../../frontend && npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run services locally**
   ```bash
   # Terminal 1 - API
   cd backend/api
   npm run dev

   # Terminal 2 - Worker
   cd backend/worker
   npm run dev

   # Terminal 3 - Frontend
   cd frontend
   npm run dev
   ```

### Building for Production

```bash
# Build all services
./scripts/build.sh

# Or build individually
cd backend/api && npm run build
cd backend/worker && npm run build
cd frontend && npm run build
```

### Running Tests

```bash
# Run all tests
./scripts/test.sh

# Or run individually
cd backend/api && npm test
cd backend/worker && npm test
cd frontend && npm test
```

## 🐳 Docker Operations

### Build Images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build api
docker-compose build worker
docker-compose build frontend
docker-compose build proxy
```

### Start Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d api
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f frontend
```

### Health Checks

```bash
# Check service health
docker-compose ps

# Check API health
curl http://localhost/api/health

# Check frontend health
curl http://localhost/health
```

## 📊 API Documentation

### Get News Articles

```bash
GET /api/news?country=us&limit=20&offset=0
```

**Query Parameters:**
- `country` (optional): Filter by country code
- `limit` (optional): Number of articles to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "articles": [...],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

### Get Article by ID

```bash
GET /api/news/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Article Title",
    "description": "Article description",
    "content": "Full content",
    "url": "https://example.com/article",
    "publishedAt": "2024-01-01T00:00:00Z",
    "country": "us",
    "category": "renewable-energy",
    "source": "source-name"
  }
}
```

### Get Countries

```bash
GET /api/countries
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "us",
      "name": "United States"
    }
  ]
}
```

## 🔒 Security

- Non-root user in all containers
- Multi-stage builds for minimal attack surface
- Security headers on all HTTP responses
- Rate limiting on API endpoints
- Environment variable validation
- No sensitive data in images

See [`SECURITY.md`](SECURITY.md) for detailed security considerations.

## 📝 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `production` |
| `OPENAI_API_KEY` | OpenAI API key for classification | Required |
| `API_PORT` | API server port | `3000` |
| `API_HOST` | API server host | `0.0.0.0` |
| `DB_PATH` | SQLite database path | `/app/data/greennews.db` |
| `CORS_ORIGIN` | CORS allowed origin | `*` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `WORKER_CRON_SCHEDULE` | Worker cron schedule | `*/15 * * * *` |
| `RSS_FETCH_INTERVAL_MINUTES` | RSS fetch interval | `15` |
| `LOG_LEVEL` | Logging level | `info` |
| `LOG_FORMAT` | Log format (json/text) | `json` |

### RSS Sources

Configure RSS sources in [`config/rss-sources.json`](config/rss-sources.json):

```json
{
  "sources": [
    {
      "name": "Example Source",
      "url": "https://example.com/rss",
      "country": "us",
      "category": "renewable-energy"
    }
  ]
}
```

## 🐛 Troubleshooting

### Database Issues

If the database is not initializing:
```bash
# Check database volume
docker-compose exec db ls -la /app/data

# Recreate database
docker-compose down -v
docker-compose up -d
```

### Worker Not Fetching

Check worker logs:
```bash
docker-compose logs -f worker
```

Verify OpenAI API key is set:
```bash
docker-compose exec worker env | grep OPENAI
```

### API Not Responding

Check API health:
```bash
curl http://localhost/api/health
```

View API logs:
```bash
docker-compose logs -f api
```

### Frontend Build Issues

Rebuild frontend:
```bash
docker-compose build frontend --no-cache
docker-compose up -d frontend
```

## 📚 Additional Documentation

- [`DEPLOYMENT.md`](DEPLOYMENT.md) - Deployment instructions
- [`SECURITY.md`](SECURITY.md) - Security considerations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `./scripts/test.sh`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [`LICENSE`](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT API
- RSS feed providers
- Open source community
