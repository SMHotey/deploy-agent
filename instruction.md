# Deploy Agent - Инструкция по локальному запуску

## Содержание
1. [Требования к системе](#1-требования-к-системе)
2. [Установка и настройка базы данных](#2-установка-и-настройка-базы-данных)
3. [Регистрация на сторонних сервисах](#3-регистрация-на-сторонних-сервисах)
4. [Настройка переменных окружения](#4-настройка-переменных-окружения)
5. [Запуск проекта](#5-запуск-проекта)
6. [Создание администратора](#6-создание-администратора)
7. [Проверка работоспособности](#7-проверка-работоспособности)
8. [Запуск Review Marketplace](#8-запуск-review-marketplace)

---

## 1. Требования к системе

### Минимальные требования:
- **OS**: Windows 10/11, macOS, или Linux
- **Node.js**: версия 18.x или выше
- **PostgreSQL**: версия 14 или выше
- **Git**: последняя стабильная версия
- **RAM**: минимум 4GB (рекомендуется 8GB)
- **Место на диске**: минимум 2GB свободного места

### Проверка установленных инструментов:
```bash
node --version    # должно быть >= 18.0.0
npm --version     # должно быть >= 9.0.0
git --version     # должно быть >= 2.30.0
psql --version    # должно быть >= 14.0
```

---

## 2. Установка и настройка базы данных

### Windows (через pgAdmin или командную строку):

1. **Скачайте PostgreSQL**:
   - Перейдите на https://www.postgresql.org/download/windows/
   - Скачайте инсталлятор (pgInstaller)
   - Запустите установку, следуйте инструкциям
   - Запомните пароль суперпользователя (postgres)

2. **Создайте базу данных**:
```bash
# Через командную строку (PowerShell):
psql -U postgres -c "CREATE DATABASE deploy_agent;"

# Или через pgAdmin:
# 1. Откройте pgAdmin
# 2. Правый клик на "Databases" -> "Create" -> "Database"
# 3. Имя базы: deploy_agent
# 4. Нажмите "Save"
```

3. **Проверьте подключение**:
```bash
psql -U postgres -d deploy_agent -c "SELECT version();"
```

### macOS (через Homebrew):
```bash
# Установка PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Создание базы данных
createdb deploy_agent

# Проверка
psql deploy_agent -c "SELECT version();"
```

### Linux (Ubuntu/Debian):
```bash
# Установка PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Запуск службы
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создание базы данных
sudo -u postgres psql -c "CREATE DATABASE deploy_agent;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Проверка
psql -U postgres -d deploy_agent -h localhost -c "SELECT version();"
```

---

## 3. Регистрация на сторонних сервисах

### 3.1 Vercel (обязательно)

Vercel используется для деплоя проектов.

1. **Регистрация**:
   - Перейдите на https://vercel.com/signup
   - Зарегистрируйтесь через GitHub, GitLab, или email
   - Подтвердите email

2. **Создание токена API**:
   - Войдите в аккаунт на https://vercel.com
   - Перейдите в "Settings" -> "Tokens" (https://vercel.com/account/tokens)
   - Нажмите "Create Token"
   - Имя токена: `deploy-agent-local`
   - Срок действия: `Custom` -> `No Expiration`
   - Нажмите "Create"
   - **Скопируйте токен** (он начинается с `vercel_`)
   - Сохраните его в безопасном месте

### 3.2 GitHub (обязательно)

GitHub используется для клонирования и анализа репозиториев.

1. **Регистрация**:
   - Перейдите на https://github.com/signup
   - Создайте аккаунт
   - Подтвердите email

2. **Создание Personal Access Token (PAT)**:
   - Войдите на https://github.com
   - Перейдите в "Settings" -> "Developer settings" -> "Personal access tokens" -> "Tokens (classic)"
   - Или перейдите по ссылке: https://github.com/settings/tokens/new
   - **Note**: `deploy-agent-local`
   - **Expiration**: `No expiration`
   - **Select scopes** (выберите минимум):
     - ✅ `repo` (полный доступ к репозиториям)
     - ✅ `read:user` (чтение профиля)
     - ✅ `read:org` (чтение организации)
   - Нажмите "Generate token"
   - **Скопируйте токен** (начинается с `ghp_`)
   - Сохраните его в безопасном месте

### 3.3 Redis (опционально)

Redis используется для кэширования и ограничения частоты запросов (rate limiting). Если не настроен, проект использует in-memory хранилище.

#### Вариант А: Локальная установка

**Windows**:
```bash
# Скачайте Redis для Windows (неофициальная сборка):
# https://github.com/microsoftarchive/redis/releases
# Или используйте WSL2 с Ubuntu
```

**macOS**:
```bash
brew install redis
brew services start redis
```

**Linux**:
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### Вариант Б: Upstash (бесплатно в облаке)

1. Перейдите на https://upstash.com
2. Зарегистрируйтесь (можно через GitHub)
3. Создайте базу данных Redis:
   - Нажмите "Create database"
   - Имя: `deploy-agent`
   - Регион: выберите ближайший к вам
   - Тип: `Free`
   - Нажмите "Create"
4. После создания, скопируйте `REDIS_URL` (в формате `redis://default:password@host:port`)

---

## 4. Настройка переменных окружения

1. **Клонируйте проект** (если еще не сделали):
```bash
git clone https://github.com/SMHotey/deploy-agent.git
cd deploy-agent
```

2. **Создайте файл .env**:
```bash
cp .env.example .env
```

3. **Откройте .env и заполните переменные**:

```env
# ==========================================
# БАЗА ДАННЫХ (обязательно)
# ==========================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deploy_agent"
# Формат: postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# ==========================================
# REDIS (опционально - если не указан, используется in-memory)
# ==========================================
# Локальный Redis:
REDIS_URL="redis://localhost:6379"
# Или Upstash (облако):
# REDIS_URL="redis://default:password@eu1-xxx.upstash.io:6379"

# ==========================================
# VERCEL (обязательно)
# ==========================================
VERCEL_TOKEN="vercel_xxxxxxxxxxxxxxxxxxxx"
# Вставьте токен, который получили в разделе 3.1

# ==========================================
# GITHUB (обязательно)
# ==========================================
GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
# Вставьте токен, который получили в разделе 3.2

# ==========================================
# БЕЗОПАСНОСТЬ (обязательно)
# ==========================================
# Ключ шифрования (32 символа) - генерируйте случайный:
ENCRYPTION_KEY="$(openssl rand -base64 32)"  # для macOS/Linux
# Или вручную: ENCRYPTION_KEY="my-32-character-encryption-key!"

# JWT секрет (можно использовать тот же, что и ENCRYPTION_KEY):
JWT_SECRET="my-32-character-encryption-key!"

# ==========================================
# ДРУГИЕ НАСТРОЙКИ (опционально)
# ==========================================
# Среда выполнения
NODE_ENV="development"

# Порт (по умолчанию 3000)
PORT=3000
```

4. **Генерация ENCRYPTION_KEY** (если нет openssl):

**Windows (PowerShell)**:
```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$key = [Convert]::ToBase64String($bytes)
Write-Output "ENCRYPTION_KEY=$key"
```

**macOS/Linux**:
```bash
openssl rand -base64 32
```

---

## 5. Запуск проекта

### 5.1 Установка зависимостей:
```bash
npm install
```

### 5.2 Применение миграций базы данных:
```bash
npm run db:push
```
Эта команда создаст все необходимые таблицы в базе данных.

**Если команда зависает:**
1. Откройте файл `drizzle/0002_review_marketplace.sql`
2. Выполните SQL вручную в psql:
```bash
psql -U postgres -d deploy_agent -f drizzle/0002_review_marketplace.sql
```

### 5.3 Запуск в режиме разработки:
```bash
npm run dev
```

Вы должны увидеть:
```
▲ Next.js 16.x.x (Turbopack)
- Local:        http://localhost:3000
- Environments: .env
✓ Ready in 5.8s
```

### 5.4 Откройте в браузере:
- Главная: http://localhost:3000/landing
- Dashboard: http://localhost:3000/dashboard
- Админка: http://localhost:3000/admin

---

## 6. Создание администратора

### Способ 1: Через SQL (рекомендуется)

1. **Выполните SQL файл**:
```bash
# Windows (PowerShell) - найдите psql.exe:
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d postgres -f "C:\Projects\DA\deploy-agent\scripts\create-admin.sql"
```

Или вручную через psql:
```sql
-- Подключитесь к базе:
psql -U postgres -d postgres

-- Выполните SQL (замените hash на актуальный):
INSERT INTO users (email, password_hash, name, is_admin, created_at, updated_at)
VALUES (
  'admin@deploy-agent.local',
  '$2b$10$TMp8qSaoxzOinRFmVTpmeeKKvdKioRNFmg3G1vRa5PqcZxnHIpdOu',
  'Admin User',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET is_admin = true;
```

### Способ 2: Через Node.js скрипт

1. **Установите зависимости** (если еще не):
```bash
npm install bcrypt pg
```

2. **Запустите скрипт**:
```bash
node scripts/create-admin.js
```

Скрипт автоматически:
- Сгенерирует bcrypt hash для пароля `admin123`
- Создаст или обновит пользователя `admin@deploy-agent.local`
- Установит права администратора (`is_admin = true`)

### Способ 3: Через интерфейс приложения

1. Запустите проект (`npm run dev`)
2. Откройте http://localhost:3000/landing
3. Нажмите "Sign Up" и создайте обычного пользователя
4. Затем выполните SQL для назначения прав админа:
```sql
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

### Данные для входа:
- **Email**: `admin@deploy-agent.local`
- **Password**: `admin123`
- **isAdmin**: `true`

### Проверка:
После создания админа, выполните:
```bash
psql -U postgres -d postgres -c "SELECT id, email, name, is_admin FROM users WHERE email = 'admin@deploy-agent.local';"
```

Должно вернуть строку с `is_admin = t`.

---

## 7. Проверка работоспособности

### 7.1 Проверка базы данных:
```bash
psql -U postgres -d deploy_agent -c "\dt"
```
Должны появиться таблицы: `users`, `projects`, `deployments`, `project_submissions`, `reviews`, `leaderboard` и др.

### 7.2 Проверка API:
```bash
# Проверка health check
curl http://localhost:3000/api/health

# Должен вернуть: {"status": "ok", "timestamp": "..."}
```

### 7.3 Вход в систему:
1. Откройте http://localhost:3000
2. Зарегистрируйтесь или войдите как admin:
   - Email: `admin@deploy-agent.local`
   - Password: `admin123`
3. После входа вы должны увидеть Dashboard

---

## 8. Запуск Review Marketplace

После настройки основного функционала, вы можете использовать Review Marketplace:

### 8.1 Доступные страницы:
- **Отправить проект на ревью**: http://localhost:3000/projects/submit-for-review
- **Список проектов для ревью**: http://localhost:3000/review
- **Рейтинг тестеров**: http://localhost:3000/leaderboard
- **Профиль пользователя**: http://localhost:3000/profile

### 8.2 Тестирование полного цикла:

1. **Создайте проект**:
   - Перейдите на http://localhost:3000/dashboard
   - Нажмите "New Project"
   - Введите URL репозитория (например, https://github.com/vercel/next.js)
   - Сохраните

2. **Отправьте проект на ревью**:
   - Перейдите на http://localhost:3000/projects/submit-for-review
   - Выберите проект
   - Заполните форму
   - Нажмите "Submit for Review"

3. **Протестируйте и оставьте отзыв**:
   - Перейдите на http://localhost:3000/review
   - Выберите проект из списка
   - Нажмите "Review"
   - Заполните форму с рейтингом и комментариями
   - Отправьте

4. **Оцените качество отзыва** (как владелец проекта):
   - Используйте API: `POST /api/reviews/rate`
   - Или сделайте это через интерфейс (если реализовано)

5. **Проверьте начисление баллов**:
   - Перейдите на http://localhost:3000/profile
   - Должны отображаться баллы и уровень

---

## Частые проблемы и решения

### Проблема: `npm run db:push` зависает
**Решение**: Выполните SQL вручную (см. раздел 5.2)

### Проблема: `password authentication failed for user "postgres"`
**Решение**: 
1. Убедитесь, что PostgreSQL запущен
2. Проверьте пароль в `DATABASE_URL`
3. Сбросьте пароль: `ALTER USER postgres PASSWORD 'postgres';`

### Проблема: `ENCRYPTION_KEY must be 32 characters`
**Решение**: Сгенерируйте корректный ключ (см. раздел 4)

### Проблема: `VERCEL_TOKEN is invalid`
**Решение**:
1. Проверьте токен на https://vercel.com/account/tokens
2. Убедитесь, что токен не истек
3. Создайте новый токен

---

## Полезные команды

```bash
# Просмотр логов
npm run dev  # логи выводятся в консоль

# Пересоздание базы данных
dropdb deploy_agent
createdb deploy_agent
npm run db:push

# Проверка типов TypeScript
npm run typecheck

# Сборка проекта
npm run build

# Запуск тестов
npm run test

# Просмотр базы данных
psql -U postgres -d deploy_agent
```

---

## Контакты и поддержка

- **GitHub Issues**: https://github.com/SMHotey/deploy-agent/issues
- **Документация Next.js**: https://nextjs.org/docs
- **Документация Drizzle ORM**: https://orm.drizzle.team/docs

---

**Готово! Теперь у вас есть полностью настроенный Deploy Agent с функционалом Review Marketplace.**
