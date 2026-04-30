# Hosting Affiliate System

Доход от партнёрских программ хостинг-провайдеров.

## Архитектура

### База данных
- `hosting_providers` — провайдеры с партнёрскими ссылками
- `affiliate_clicks` — трекинг кликов по ссылкам
- `affiliate_conversions` — записи о конверсиях (заработанные комиссии)

### API Endpoints

| Method | Endpoint | Описание |
|--------|----------|------------|
| GET | `/api/hosting/recommendations?projectId=123` | Рекомендации хостинга под проект |
| POST | `/api/hosting/click` | Трекинг клика + редирект на партнёрскую ссылку |
| POST | `/api/hosting/conversions` | Webhook от провайдеров о конверсии |
| GET/POST/PUT/DELETE | `/api/admin/hosting-providers` | CRUD провайдеров (admin) |
| GET | `/api/admin/hosting-analytics?days=30` | Аналитика по кликам и комиссиям |

### Страницы
- `/hosting?projectId=123` — рекомендации для пользователей
- `/admin/hosting-providers` — управление провайдерами (admin)
- `/admin/hosting-analytics` — аналитика (admin)

## Добавление нового провайдера

### 1. Через API (рекомендуется)
```bash
curl -X POST http://localhost:3000/api/admin/hosting-providers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -d '{
    "name": "New Provider",
    "slug": "new-provider",
    "description": "Great hosting for...",
    "logoUrl": "https://example.com/logo.png",
    "affiliateUrl": "https://partner.example.com/ref/123",
    "commissionRate": "$20 per signup",
    "commissionType": "cpa",
    "categories": ["frontend", "react", "static"],
    "features": ["Free SSL", "CDN", "24/7 Support"],
    "pricing": [
      {"plan": "Free", "price": "$0", "specs": ["1GB storage", "Limited bandwidth"]},
      {"plan": "Pro", "price": "$10/mo", "specs": ["10GB storage", "Unlimited bandwidth"]}
    ]
  }'
```

### 2. Прямо в БД
```sql
INSERT INTO hosting_providers (name, slug, affiliate_url, commission_rate, commission_type, categories, features)
VALUES ('Provider Name', 'provider-slug', 'https://affiliate-link', '$20/signup', 'cpa', '["frontend"]', '["CDN","SSL"]');
```

### 3. Массовое добавление (seed)
```bash
# Добавляет 10 популярных провайдеров (Vercel, Netlify, DigitalOcean, etc.)
npx tsx src/lib/seed-hosting.ts
```

## Трекинг конверсий

Провайдеры отправляют webhook при конверсии (signup, оплата):

```bash
curl -X POST http://localhost:3000/api/hosting/conversions \
  -H "Content-Type: application/json" \
  -H "x-provider-slug: vercel" \
  -d '{
    "externalId": "conv_123",
    "userId": 1,
    "projectId": 5,
    "conversionType": "signup",
    "conversionValue": 2000
  }'
```

## Автоматическое обновление

Скрипт `src/lib/hosting-sync.ts` для синхронизации с партнёрскими сетями:

```bash
# Запуск вручную
node -e "require('./dist/lib/hosting-sync.js').syncHostingProviders()"

# Или по крону (раз в неделю)
0 0 * * 0 node /path/to/deploy-agent/dist/lib/hosting-sync.js
```

## Монетизация

### Текущие провайдеры (после seed)
| Провайдер | Тип комиссии | Ставка |
|-----------|-------------|--------|
| Vercel | Revenue Share | Custom |
| Netlify | Revenue Share | 10% recurring |
| DigitalOcean | CPA | $25 per signup |
| Railway | CPA | $5 credit |
| Render | Revenue Share | 10% for 12 months |
| Fly.io | CPA | $10 credit |
| Cloudflare Pages | Revenue Share | 10% recurring |
| Heroku | Revenue Share | 15% for 6 months |
| AWS Amplify | Revenue Share | Up to 5% |
| Bluehost | CPA | $65 per sale |

### Рекомендации
Алгоритм подбирает хостинг на основе:
- Платформы проекта (`vercel`, `netlify`, etc.)
- Фреймворка (`next.js`, `react`, `vue`, `static`)
- Версии Node.js
- Наличия нужных фич (`edge`, `serverless`, `free tier`)

## TODO
- [ ] Настроить реальные API-интеграции с партнёрскими сетями
- [ ] Добавить выплаты (Stripe Connect)
- [ ] Генерировать уникальные реферальные ссылки для каждого юзера
- [ ] Добавить дашборд заработка для юзеров
- [ ] Интеграция с LinkShare, Impact, PartnerStack
