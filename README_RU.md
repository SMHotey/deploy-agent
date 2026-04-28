# Deploy Agent

Автоматизированный агент для деплоя Git-репозиториев на Vercel (и другие платформы). Frontend на Next.js 16 (App Router) + API routes, PostgreSQL через Drizzle ORM, Redis для ограничения частоты запросов.

## Быстрый старт

### 1. Клонирование и установка

```bash
cd C:\Projects\DA\deploy-agent
npm install
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните переменные:

```bash
copy .env.example .env
```

**Обязательные переменные:**
- `DATABASE_URL` — строка подключения к PostgreSQL (например: `postgresql://postgres:postgres@localhost:5432/deploy_agent`)
- `ENCRYPTION_KEY` — 32-байтный ключ для AES-256-GCM (можно использовать: `12345678901234567890123456789012`)
- `REDIS_URL` — строка подключения к Redis (необязательно, по умолчанию используется in-memory)

**Опциональные переменные:**
- `VERCEL_TOKEN` — токен API Vercel (для деплоя)
- `GITHUB_TOKEN` — персональный токен доступа GitHub (scope: repo)
- `JWT_SECRET` — секрет для JWT-токенов (по умолчанию используется ENCRYPTION_KEY)
- `LOG_LEVEL` — уровень логирования (debug, info, warn, error)
- `ALLOWED_ORIGINS` — разрешенные CORS-домены через запятую

### 3. Инициализация базы данных

```bash
npm run db:push
```

### 4. Запуск сервера

**Режим разработки (рекомендуется):**
```bash
npm run dev
```
Сервер запустится на `http://localhost:3000`.

**Режим продакшена:**
```bash
npm run build
npm run start
```

## Основные команды

```bash
npm run dev          # Запуск сервера разработки (Turbopack)
npm run build        # Сборка продакшена (Turbopack)
npm run start        # Запуск продакшен-сервера
npm run lint         # Проверка ESLint
npm run typecheck    # Проверка TypeScript (tsc --noEmit)
npm run test         # Запуск тестов (vitest)
npm run db:push      # Обновление схемы БД (Drizzle)
npm run db:generate  # Генерация миграций Drizzle
```

## API Endpoints

### Аутентификация

**Регистрация:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Test1234!", "name": "Test User"}'
```

**Вход:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Test1234!"}'
```

**Текущий пользователь:**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer ВАШ_JWT_ТОКЕН"
```

### Деплой

```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ВАШ_JWT_ТОКЕН" \
  -d '{
    "repo_url": "https://github.com/user/repo",
    "target_platform": "vercel"
  }'
```

### Проекты

**Список проектов:**
```bash
curl http://localhost:3000/api/projects \
  -H "Authorization: Bearer ВАШ_JWT_ТОКЕН"
```

**Создание проекта:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ВАШ_JWT_ТОКЕН" \
  -d '{"name": "my-project", "repo_url": "https://github.com/user/repo"}'
```

### Проверка здоровья

```bash
curl http://localhost:3000/api/health
```

## Безопасность

- **JWT-аутентификация**: пользователи регистрируются и входят через `/api/auth/*`
- **Персональные токены**: пользователи хранят свои токены Vercel/GitHub в базе данных (шифруются AES-256-GCM)
- **Ограничение частоты**: 10 запросов в минуту на IP (Redis или in-memory)
- **Security-заголовки**: X-Content-Type-Options, X-Frame-Options, CORS (настраивается через ALLOWED_ORIGINS)
- **Стандартизированные ошибки**: в ответах не выводятся внутренние детали

## Архитектура

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS v4
- **Backend**: Next.js API Routes + сервисы на Node.js
- **База данных**: PostgreSQL (через Drizzle ORM)
- **Очередь/кеш**: Redis (совместимо с Upstash)

### Структура проекта

```
src/
  app/
    api/
      auth/         # Регистрация, вход, профиль
      deploy/       # Создание деплоя, статус/логи
      health/       # Проверка здоровья (БД + Redis)
      projects/     # Управление проектами
  lib/
    auth.ts         # JWT, аутентификация, шифрование токенов
    deploy.ts       # Оркестрация деплоя (расширяемая архитектура)
    vercel.ts       # Клиент Vercel API (с таймаутами)
    encryption.ts   # Шифрование AES-256-GCM
    rate-limiter.ts # Ограничение частоты (Redis/in-memory)
    logger.ts       # Структурированные логи с request ID
    shutdown.ts     # Graceful shutdown (SIGTERM/SIGINT)
    config.ts       # Валидация переменных окружения при старте
  db/
    schema.ts       # Схема Drizzle (users, projects, deployments...)
    index.ts        # Пул подключений к БД
```

## Тестирование

**Модульные тесты (unit tests):**
```bash
npm run test
```
Проходит 22 теста (encryption, retry, validation, auth).

**Интеграционные тесты:**
Требуют запущенный сервер. Установите переменную `DEPLOY_AGENT_URL` (по умолчанию `http://localhost:3000`).

## Docker

```bash
docker-compose up --build
```
Поднимает полный стек: app + PostgreSQL 15 + Redis 7.

## Особенности Next.js 16

Проект использует Next.js 16 с Turbopack (по умолчанию для `dev` и `build`):
- **Таймауты**: все внешние API-вызовы (Vercel, GitHub) имеют таймаут 30 секунд
- **Асинхронные API**: `cookies()`, `headers()`, `params` — только async
- **Proxy**: файл `proxy.ts` в корне (бывший middleware)
- **Параллельные маршруты**: требуют явного `default.js`

## Известные проблемы

- **npm audit**: 6 умеренных уязвимостей (esbuild <0.24.2, postcss <8.5.10) — требуют breaking changes
- **Rate limiter**: тест сброса лимита может некорректно работать в определенных условиях
- **Vitest**: некоторые тесты модулей могут не запускаться из-за проблем с алиасами путей `@/`

## Лицензия

MIT
