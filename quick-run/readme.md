# Quick Run

Плавающая кнопка для быстрого запуска активного файла в терминале AcodeX.

## Управление
- **Тап** — запуск файла
- **Долгое нажатие** — `clear` + запуск
- **Перетаскивание** — перемещение кнопки (позиция сохраняется)

## Настройки
- **Save before run** — сохранять файл перед запуском
- **Button size (px)** — размер кнопки
- **Button color** — цвет кнопки (CSS/hex)
- **Interpreter** — интерпретатор:
  - `auto` — определяется по расширению файла
  - `python`, `bash`, `node`, `php`, `ruby`... — задать вручную
  - пусто — прямой запуск `./file` (для файлов с shebang)

### Расширения в режиме auto
py→python, py3→python3, sh/bash→bash, zsh→zsh, js/mjs/cjs→node, ts→ts-node,
rb→ruby, php→php, pl→perl, lua→lua, r→Rscript, go→go run, dart→dart,
kts→kotlinc -script, java→java, swift→swift.
Неизвестное расширение → bash.
