Ты — опытный full-stack разработчик, специализирующийся на платформенных решениях и облачной автоматизации.

Твоя задача — создать приложение для автоматического развертывания (deploy agent) из git-репозиториев. Приложение должно принимать на вход **URL git-репозитория** (GitHub, GitLab, Bitbucket) и опциональные параметры, а на выходе отдавать **ссылку на развернутый проект на Vercel (или другую платформу)**, его статус и инструкцию по работе.

Вдохновляйся лучшими подходами `vercel-auto-deploy`, но расширь функционал до полноценного production-ready агента с поддержкой бэкенда (Supabase), полным контролем через API и возможностью кастомизации через IaC.

## 🎯 Цель и архитектура

Приложение должно абстрагировать сложность настройки CI/CD и предоставлять пользователям простой интерфейс: введи URL репозитория → получи живой проект.

**Архитектура:**

-   **Frontend:** Next.js (App Router) + TailwindCSS + shadcn/ui.
-   **Backend:** API Routes (Next.js) или отдельный Node.js сервис.
-   **Планировщик задач:** Inngest / BullMQ для обработки тяжелых задач (деплой, миграции БД).
-   **База данных для приложения:** PostgreSQL (для хранения пользователей, проектов, логов).
-   **Очередь:** Upstash Redis для распределенных очередей.

## 🧩 Настраиваемые параметры (полностью конфигурируемые)

Все перечисленные ниже параметры должны быть **опциональными** и иметь значения по умолчанию. Пользователь может их переопределить через UI при создании деплоя или через POST-запрос к API.

### 🌐 1. Общие параметры проекта

-   `repo_url` **(обязательный):** URL git-репозитория (поддержка GitHub, GitLab, Bitbucket).
-   `project_name`: желаемое имя проекта на целевой платформе (по умолчанию = имя репозитория).
-   `project_description`: описание проекта.
-   `target_platform`: целевая платформа для деплоя (`vercel`, `netlify`, `cloudflare-pages`, `railway`, `self-hosted-docker`). По умолчанию `vercel`.
-   `root_directory`: корневая директория проекта в репозитории (для монорепозиториев). По умолчанию `/`.
-   `branch`: ветка для деплоя. По умолчанию `main` или `master`.
-   `build_override`: кастомная build-команда (переопределяет автоопределение платформы).
-   `output_directory`: директория с результатами сборки (для статики). По умолчанию платформенная (например, `dist` или `build`).
-   `environment_slug`: окружение (`production`, `preview`, `development`). По умолчанию `production`.

### ⚙️ 2. Параметры Vercel (из API и vercel.json)

-   `framework_preset`: фреймворк (`nextjs`, `react`, `vue`, `angular`, `svelte`, `astro`, `other`). По умолчанию автоопределение.
-   `install_command`: `npm install`, `yarn`, `pnpm`, `bun`. По умолчанию определяется по lock-файлу.
-   `build_command`: кастомная команда сборки (по умолчанию определяется framework preset).
-   `dev_command`: команда для разработки.
-   `output_directory`: (повторяется из общих) — специфичный для Vercel.
-   `vercel.json` content: возможность передать полный JSON-конфиг для тонкой настройки (rewrites, redirects, headers, serverless functions).
-   `serverless_function_region`: регион для serverless функций (например, `fra1`, `iad1`, `syd1`). По умолчанию автоматический.
-   `environment_variables`: объект с переменными среды для проекта. **Критично для безопасности:** нужно реализовать механизм шифрования чувствительных данных (API-ключи, секреты) перед сохранением в БД.
-   `deploy_hook`: возможность указать собственный URL деплой-хука (вместо создания нового).
-   `ignore_build_step`: пропустить шаг сборки на Vercel, загружая уже собранные артефакты (использует `vercel deploy --prebuilt`).

### 🗄️ 3. Параметры Supabase (для автоматизации бэкенда)

-   `create_supabase_project`: булев флаг, создавать ли новый Supabase проект. По умолчанию `false`.
-   `supabase_organization_id`: ID организации Supabase (если создается новый проект).
-   `supabase_region`: регион Supabase (`us-east-1`, `us-west-1`, `eu-west-1`, `ap-southeast-1`).
-   `supabase_database_password`: пароль для базы данных (можно указать или сгенерировать автоматически). Предупреждение: Vercel рекомендует очень надежный пароль для каждой базы данных, не повторяя его между проектами.
-   `supabase_plan`: тарифный план (`free`, `pro`, `team`). По умолчанию `free`.
-   `supabase_template_url`: URL шаблона для инициализации схемы и миграций (`supabase bootstrap`).
-   `run_migrations`: булев флаг, запускать ли миграции из папки `supabase/migrations`. По умолчанию `false`.
-   `supabase_env_keys`: список переменных среды, которые нужно автоматически синхронизировать с Vercel (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY`).

### 👥 4. Параметры GitHub Actions / CI/CD

-   `setup_github_actions`: булев флаг, создавать ли `.github/workflows/deploy.yml` в репозитории.
-   `exclude_authors`: список авторов коммитов, для которых деплой не должен триггериться (например, `['dependabot[bot]', 'github-actions[bot]']`). Полезно для open source проектов.
-   `trigger_branches`: ветки, при пуше в которые должен запускаться деплой. По умолчанию `[main, master]`.
-   `preview_for_pr`: булев флаг, создавать ли preview-деплой для каждого pull request. По умолчанию `true`.
-   `github_token`: GitHub Personal Access Token для создания workflow-файла и настройки секретов.

### 🏗️ 5. Параметры IaC (Terraform / Pulumi)

-   `generate_terraform`: булев флаг, генерировать ли Terraform конфигурацию для созданной инфраструктуры.
-   `terraform_providers`: список провайдеров (vercel, supabase, cloudflare, aws и т.д.).
-   `terraform_state_backend`: бэкенд для хранения состояния Terraform (`local`, `s3`, `gcs`, `azurerm`).

### 🌍 6. Параметры домена и DNS

-   `custom_domain`: пользовательский домен для проекта.
-   `enable_ssl`: булев флаг, автоматически выпускать SSL-сертификат (все платформы это делают по умолчанию). По умолчанию `true`.
-   `dns_provider`: провайдер DNS (cloudflare, route53, digitalocean и др.) для автоматической настройки записей.
-   `dns_api_token`: API-токен провайдера DNS.

### 📢 7. Параметры нотификаций

-   `notification_slack`: Slack Webhook URL для уведомлений о статусе деплоя.
-   `notification_email`: email для уведомлений.
-   `notification_discord`: Discord Webhook URL.
-   `notification_ms_teams`: MS Teams Webhook URL.

### 🔐 8. Параметры безопасности

-   `enable_webhook_validation`: требовать подпись запросов от git-провайдера (секрет для вебхука).
-   `vercel_auth_protection`: отключать ли Vercel Authentication (SSO-protection) после деплоя. Актуально для публичных проектов (можно установить `false` после деплоя).
-   `ip_whitelist`: список IP-адресов, которым разрешен доступ к проекту.
-   `scan_vulnerabilities`: булев флаг, запускать ли сканирование зависимостей на уязвимости перед деплоем.
-   `audit_logs`: сохранять ли аудит-логи всех действий.
-   `environment_variables_encryption`: алгоритм шифрования переменных среды (по умолчанию AES-256-GCM).

### 🛠️ 9. Параметры CLI и автоматизации

-   `cli_mode`: булев флаг, запускать ли агент в интерактивном CLI-режиме (аналог `vercel --yes`).
-   `auto_confirm`: автоматически подтверждать все действия (для CI/CD). По умолчанию `false`.
-   `timeout_seconds`: таймаут операции в секундах. По умолчанию 600 (10 минут).
-   `retry_count`: количество повторов при временных ошибках. По умолчанию 3.
-   `parallel_deploys`: максимальное количество параллельных деплоев. По умолчанию 5.

### 🎨 10. Параметры UI и опыта пользователя

-   `project_badge`: генерировать ли бейдж статуса для README (аналог "Deployed by ...").
-   `custom_favicon`: URL кастомной иконки для развернутого проекта.
-   `deployment_message`: кастомное сообщение, отображаемое в логах деплоя.
-   `wait_for_completion`: ждать ли завершения деплоя перед ответом API. По умолчанию `true` (может быть `false` для асинхронного режима).

### 📊 11. Параметры логирования и аналитики

-   `log_level`: уровень логирования (`debug`, `info`, `warn`, `error`). По умолчанию `info`.
-   `log_retention_days`: количество дней хранения логов деплоя. По умолчанию 30.
-   `send_analytics`: булев флаг, отправлять ли анонимную аналитику использования (помогает улучшать сервис). По умолчанию `true`.
-   `integrate_sentry`: DSN для интеграции с Sentry (мониторинг ошибок).

## 🧠 Лучшие практики из vercel-auto-deploy, которые нужно реализовать

1.  **Фильтрация авторов:** возможность исключать деплой для конкретных пользователей (например, для ботов dependabot, для самого владельца репозитория).
2.  **Автоматический триггер по событиям:** опция `on: push: branches: [main, master]` для автоматического деплоя, но с возможностью отключить для определенных коммитов.
3.  **Работа с Deploy Hooks:** автоматически создавать deploy hook через Vercel API, чтобы триггерить деплой из CI/CD.
4.  **Ленивый деплой (deploy-on-demand):** деплоить проект только когда есть изменения в коде, а не по расписанию.
5.  **Обработка ошибок:** при неудачном деплое — предоставлять ссылку на логи Vercel и рекомендации по исправлению.
6.  **Backoff и ретраи:** при временных ошибках API (rate limits, network blips) — повторять запросы с экспоненциальной задержкой.

## ♻️ Дополнительные интеграции для расширения функциональности

-   **Netlify API:** добавить поддержку Netlify наряду с Vercel.
-   **Cloudflare Pages API:** добавить поддержку Cloudflare Pages (особенно для JAMstack).
-   **Koyeb / Render / Railway:** поддержка альтернативных платформ для пользователей, не желающих использовать Vercel.
-   **Upstash Redis:** использовать для кэширования результатов деплоя и ограничения частоты запросов (rate limiting).
-   **Inngest / BullMQ:** очередь для тяжелых операций (миграции БД, развертывание больших проектов).
-   **Sentry:** глобальная обработка ошибок и отслеживание производительности.
-   **Logflare / Axiom:** агрегация логов деплоев от разных платформ в одном месте.
-   **Pulumi Automation API:** использовать для IaC-подхода (более высокоуровневый, чем Terraform).
-   **Clerk / Auth0:** управление пользователями и RBAC в самом приложении-деплоере.
-   **Stripe:** для биллинга, если вы планируете monetize свой deploy agent (например, по числу деплоев в месяц).

## 📦 Требования к реализации

**Backend:**

-   Используй TypeScript.
-   Используй Prisma или Drizzle для работы с PostgreSQL.
-   Реализуй **политику повторных попыток (retry + exponential backoff)** для всех внешних API (Vercel, GitHub, Supabase).
-   Добавь **graceful shutdown** для обработки сигналов SIGTERM при завершении работы.
-   Все чувствительные данные (API ключи, пароли БД) должны храниться в зашифрованном виде.
-   Реализуй **rate limiting** на каждый доступ к API деплоера (например, 10 запросов в минуту на пользователя).

**Frontend (опционально, если нужен UI):**

-   Простая форма-мастер для заполнения параметров деплоя.
-   Список всех созданных проектов с их статусами и ссылками.
-   Возможность просматривать логи деплоя в реальном времени (используй Server-Sent Events или WebSockets).

**CLI (опционально):**

-   Реализуй CLI-инструмент на Node.js, который принимает аргументы, аналогичные параметрам выше, и вызывает API.
-   Поддержи вывод в машиночитаемом формате (JSON) для использования в CI/CD.

## 🧱 Примеры запросов к API

**Создание простого проекта (только фронтенд, минимальные параметры):**

```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/vercel/next.js",
    "project_name": "my-next-app"
  }'

**Ответ:**

json
{
  "deployment_id": "dep_123456",
  "status": "building",
  "url": "https://my-next-app.vercel.app",
  "logs_url": "http://localhost:3000/deployments/dep_123456/logs"
}
Создание full-stack проекта (Next.js + Supabase, с миграциями и env-синхронизацией):

bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/vercel/next.js",
    "project_name": "my-fullstack-app",
    "environment_variables": {
      "NEXT_PUBLIC_SOME_KEY": "value123"
    },
    "create_supabase_project": true,
    "supabase_organization_id": "org_123",
    "run_migrations": true,
    "setup_github_actions": false,
    "notification_slack": "https://hooks.slack.com/services/..."
  }'
Создание проекта с Terraform-конфигом и кастомной сборкой:

bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/my-org/monorepo",
    "root_directory": "/apps/web",
    "build_override": "turbo run build --filter=web",
    "output_directory": "dist",
    "generate_terraform": true,
    "terraform_providers": ["vercel", "cloudflare"],
    "custom_domain": "myapp.example.com"
  }'
📚 Документация и обучение
В результате ты должен предоставить:

Полный код приложения (backend, frontend, CLI).

Файлы конфигурации (Dockerfile, docker-compose.yml для локальной разработки).

.env.example со всеми необходимыми переменными окружения.

README.md с инструкцией по запуску, настройке и деплою самого агента.

API-документацию (можно OpenAPI/Swagger).

Примеры использования CLI.

🧪 Тестирование
Напиши интеграционные тесты для следующих сценариев:

Успешный деплой публичного репозитория на Vercel.

Деплой с неверным URL репозитория (ошибка валидации).

Деплой с созданием нового Supabase проекта.

Деплой с кастомной build-командой.

Повторная попытка (retry) после временной ошибки API.

Rate limiting при превышении лимита запросов.

🔮 Будущее развитие (roadmap)
Укажи в документации возможные направления улучшения:

Поддержка деплоя из приватных репозиториев (через OAuth).

Поддержка деплоя на собственные серверы (Docker, Kubernetes).

Автоматическое A/B тестирование с помощью Vercel Flags.

Поддержка edge functions (Vercel Edge, Cloudflare Workers).

Dashboard для аналитики деплоев (успешные/неудачные, время сборки).