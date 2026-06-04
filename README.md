# Todo App — Playwright Automation

## Описание проекта

Автоматизированное тестирование Angular Todo List приложения с использованием Playwright (JavaScript).

Приложение под тестами: [angular-todo-app](../angular-todo-app) (API: JSONPlaceholder).

## Стек технологий

- Playwright
- JavaScript
- Page Object Model (POM)
- HTML Reporter

## Структура проекта

```
todo-app-playwright-tests/
├── tests/
│   ├── specs/
│   │   └── add-todo.spec.js      # Автотесты (TC-01 … TC-10)
│   ├── pages/
│   │   └── TodoPage.js           # Page Object
│   └── exploratory/
│       └── explore-bugs.mjs      # Исследовательское тестирование (Часть 2)
├── docs/
│   └── BUG-REPORTS-PART2.md      # Баг-репорты
├── playwright.config.js
└── package.json
```

## Реализованные тест-кейсы

### Позитивные

| ID | Сценарий |
|----|----------|
| TC-01 | Добавление новой задачи |
| TC-03 | Отметка задачи как выполненной |
| TC-05 | Удаление задачи |
| TC-06 | Работа фильтра Active |
| TC-10 | Поведение после перезагрузки страницы (задача не сохраняется в mock API) |

### Исследовательское тестирование (Часть 2)

Ручной и полуавтоматический прогон сценариев: пустой ввод, длинный текст, спецсимволы, массовое добавление, быстрый Add, фильтры, редактирование, удаление всех задач.

Результаты: [docs/BUG-REPORTS-PART2.md](docs/BUG-REPORTS-PART2.md)

## Как запустить тесты

### Требования

- Node.js 18+
- Запущенное Angular-приложение на `http://localhost:4200`

### 1. Запустить приложение

```bash
cd ../angular-todo-app
npm install
npm start
```

### 2. Установить зависимости и браузеры (один раз)

```bash
cd ../todo-app-playwright-tests
npm install
npx playwright install
```

### 3. Запустить автотесты

```bash
npx playwright test
```

или:

```bash
npm test
```

### 4. Открыть HTML-отчёт

```bash
npx playwright show-report
```

### Дополнительно

```bash
# Один файл
npx playwright test tests/specs/add-todo.spec.js

# С UI (интерактивный режим)
npx playwright test --ui

# Исследовательский скрипт (Часть 2)
node tests/exploratory/explore-bugs.mjs
```

## Конфигурация

| Параметр | Значение |
|----------|----------|
| `baseURL` | `http://localhost:4200` |
| Браузер | Chromium |
| Retries | 1 |
| Reporter | HTML |

Настройки: [playwright.config.js](playwright.config.js)

## Page Object

Класс `TodoPage` (`tests/pages/TodoPage.js`):

- `goto()` — открыть главную
- `addTodo(text)` — добавить задачу
- `toggleTodo(text)` — отметить выполненной
- `deleteTodo(text)` — удалить
- `todoItem(text)` — локатор строки задачи
- фильтры: `allFilter`, `activeFilter`, `completedFilter`

## CI

Пример workflow: [.github/workflows/playwright.yml](.github/workflows/playwright.yml)
