# Мондавошка Online Server

Сервер не требует npm-зависимостей. Нужен Node.js 20+.

## Локальный запуск
```bash
npm start
```
Откройте `http://localhost:8080` в двух браузерах/устройствах.

## Публикация
Загрузите эту папку на любой Node.js-хостинг. Команда запуска: `npm start`. Порт берётся из переменной `PORT`.
После публикации WebSocket-адрес будет вида `wss://ВАШ-ДОМЕН/ws`. Его нужно записать в `online-config.js` клиентской сборки для Яндекс Игр.


## Быстрый деплой на Render
В корне проекта уже есть `render.yaml`.

Параметры:
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`

После публикации:
1. Откройте `https://ВАШ-СЕРВИС.onrender.com/health`
2. Если всё работает, увидите JSON с `"ok": true`
3. Адрес WebSocket для клиента: `wss://ВАШ-СЕРВИС.onrender.com/ws`
