/**
 * Exploratory testing script — Part 2 bug hunting
 * Run: node tests/exploratory/explore-bugs.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4200';

async function createPage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(BASE);
  await page.waitForSelector('.task-item', { timeout: 15000 });
  return { browser, page };
}

async function countTasks(page) {
  return page.locator('.task-item').count();
}

async function addViaUi(page, text) {
  await page.locator('input.task-input').fill(text);
  await page.locator('button.add-button').click();
  await page.waitForTimeout(600);
}

const findings = [];

function report(id, title, severity, steps, expected, actual) {
  findings.push({ id, title, severity, steps, expected, actual });
}

async function main() {
  // --- 1. Empty text ---
  {
    const { browser, page } = await createPage();
    const before = await countTasks(page);
    await page.locator('input.task-input').fill('');
    await page.locator('button.add-button').click();
    await page.waitForTimeout(500);
    const after = await countTasks(page);
    const emptyRows = await page.locator('.task-title').filter({ hasText: /^\s*$/ }).count();
    if (after !== before || emptyRows > 0) {
      report('BUG-01', 'Пустая задача добавляется или меняет список', 'Medium',
        'Add с пустым полем', 'Список без изменений', `before=${before} after=${after} emptyTitles=${emptyRows}`);
    }
    await browser.close();
  }

  // --- 2. Very long text ---
  {
    const { browser, page } = await createPage();
    const longText = 'A'.repeat(5000);
    await addViaUi(page, longText);
    await page.waitForTimeout(2000);
    const visible = await page.getByText(longText.substring(0, 100), { exact: false }).first().isVisible().catch(() => false);
    const overflow = await page.evaluate(() => {
      const el = document.querySelector('.task-title');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const p = el.parentElement?.getBoundingClientRect();
      return { titleWidth: r.width, parentWidth: p?.width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    if (!visible) {
      report('BUG-02', 'Очень длинный текст не отображается', 'High',
        'Добавить задачу из 5000 символов', 'Задача видна в списке', 'Задача не найдена на странице');
    }
    if (overflow && overflow.scrollWidth > overflow.clientWidth + 50) {
      report('BUG-03', 'Длинный текст ломает вёрстку (overflow)', 'Low',
        'Добавить задачу из 5000 символов', 'Текст обрезается или переносится', JSON.stringify(overflow));
    }
    await browser.close();
  }

  // --- 3. Special characters ---
  {
    const { browser, page } = await createPage();
    const special = '<script>alert(1)</script> & " \' > test';
    await addViaUi(page, special);
    await page.waitForTimeout(2000);
    const html = await page.locator('.task-item').filter({ hasText: 'alert' }).first().innerHTML().catch(() => '');
    const hasScriptTag = html.includes('<script>');
    const displayed = await page.locator('.task-title').filter({ hasText: 'alert' }).first().textContent();
    if (hasScriptTag) {
      report('BUG-04', 'XSS: HTML не экранируется', 'Critical',
        `Добавить: ${special}`, 'Текст как строка', `innerHTML содержит script: ${html.slice(0, 200)}`);
    }
    if (!displayed?.includes('<')) {
      report('BUG-05', 'Спецсимволы отображаются некорректно', 'Medium',
        `Добавить: ${special}`, 'Видны < > & " \'', `textContent: ${displayed}`);
    }
    await browser.close();
  }

  // --- 4. Many tasks 20+ ---
  {
    const { browser, page } = await createPage();
    const prefix = `bulk_${Date.now()}_`;
    for (let i = 0; i < 25; i++) {
      await addViaUi(page, `${prefix}${i}`);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(3000);
    let found = 0;
    for (let i = 0; i < 25; i++) {
      if (await page.getByText(`${prefix}${i}`).isVisible().catch(() => false)) found++;
    }
    if (found < 25) {
      report('BUG-06', 'Не все задачи появляются при массовом добавлении', 'High',
        'Добавить 25 задач подряд', '25 задач в списке', `Найдено ${found} из 25`);
    }
    await browser.close();
  }

  // --- 5. Rapid Add clicks ---
  {
    const { browser, page } = await createPage();
    const text = `rapid_${Date.now()}`;
    await page.locator('input.task-input').fill(text);
    const clicks = 15;
    await Promise.all(Array.from({ length: clicks }, () => page.locator('button.add-button').click()));
    await page.waitForTimeout(3000);
    const count = await page.locator('.task-item').filter({ hasText: text }).count();
    if (count > 1) {
      report('BUG-07', 'Дубликаты при быстром нажатии Add', 'Medium',
        `15 кликов Add с одним текстом "${text}"`, 'Одна задача', `Найдено ${count} дубликатов`);
    }
    if (count === 0) {
      report('BUG-08', 'Задача потеряна при быстром Add', 'High',
        '15 быстрых кликов Add', 'Хотя бы одна задача', 'Задача не найдена');
    }
    await browser.close();
  }

  // --- 6. Filters after changes ---
  {
    const { browser, page } = await createPage();
    const taskText = `filter_test_${Date.now()}`;
    await addViaUi(page, taskText);
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Active' }).click();
    const onActive = await page.getByText(taskText).isVisible();
    await page.getByRole('button', { name: 'Completed' }).click();
    const onCompleted = await page.getByText(taskText).isVisible();
    await page.getByRole('button', { name: 'All' }).click();
    const row = page.locator('.task-item').filter({ hasText: taskText });
    await row.locator('input.task-checkbox').check();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Completed' }).click();
    const onCompletedAfter = await page.getByText(taskText).isVisible();
    await page.getByRole('button', { name: 'Active' }).click();
    const onActiveAfter = await page.getByText(taskText).isVisible();
    if (!onActive) {
      report('BUG-09', 'Новая активная задача не видна в фильтре Active', 'High',
        'Добавить задачу → Active', 'Задача видна', 'Не видна');
    }
    if (onCompleted) {
      report('BUG-10', 'Незавершённая задача видна в Completed', 'High',
        'Добавить задачу → Completed без отметки', 'Не видна', 'Видна');
    }
    if (!onCompletedAfter) {
      report('BUG-11', 'Выполненная задача не видна в Completed', 'High',
        'Отметить выполненной → Completed', 'Видна', 'Не видна');
    }
    if (onActiveAfter) {
      report('BUG-12', 'Выполненная задача видна в Active', 'Medium',
        'Отметить выполненной → Active', 'Не видна', 'Видна');
    }
    await browser.close();
  }

  // --- 7. Edit task ---
  {
    const { browser, page } = await createPage();
    const original = `edit_orig_${Date.now()}`;
    const updated = `edit_new_${Date.now()}`;
    await addViaUi(page, original);
    await page.waitForTimeout(1000);
    const row = page.locator('.task-item').filter({ hasText: original });
    await row.locator('button.edit-button').click();
    const editInput = row.locator('input.edit-input');
    if (!(await editInput.isVisible())) {
      report('BUG-13', 'Режим редактирования не открывается', 'High',
        'Add → Edit', 'Поле редактирования', 'Не появилось');
    } else {
      await editInput.fill(updated);
      await row.locator('button.save-button').click();
      await page.waitForTimeout(1500);
      const seesNew = await page.getByText(updated).isVisible().catch(() => false);
      const seesOld = await page.getByText(original).isVisible().catch(() => false);
      if (!seesNew || seesOld) {
        report('BUG-14', 'Сохранение редактирования не работает', 'High',
          `Edit "${original}" → "${updated}" → Save`, 'Только новый текст', `new=${seesNew} old=${seesOld}`);
      }
      // empty save on another task
      await addViaUi(page, `edit_empty_${Date.now()}`);
      await page.waitForTimeout(800);
      const row2 = page.locator('.task-item').filter({ hasText: /edit_empty_/ }).first();
      const t2 = await row2.locator('.task-title').textContent();
      await row2.locator('button.edit-button').click();
      await row2.locator('input.edit-input').fill('   ');
      await row2.locator('button.save-button').click();
      await page.waitForTimeout(1000);
      const stillThere = await page.getByText(t2.trim()).isVisible().catch(() => false);
      const blankVisible = await page.locator('.task-title').filter({ hasText: /^\s*$/ }).count();
      if (!stillThere && blankVisible) {
        report('BUG-15', 'Сохранение пустого текста при редактировании', 'Medium',
          'Edit → пробелы → Save', 'Старое название или валидация', 'Пустая/исчезнувшая задача');
      }
    }
    await browser.close();
  }

  // --- 8. Delete all tasks ---
  {
    const { browser, page } = await createPage();
    let initial = await countTasks(page);
    if (initial === 0) {
      report('BUG-16', 'Список пуст при первой загрузке', 'Low',
        'Открыть приложение', 'Задачи с API (limit 10)', '0 задач');
    }
    while (await countTasks(page) > 0) {
      const first = page.locator('.task-item').first();
      await first.locator('button.delete-button').click();
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(500);
    const afterDelete = await countTasks(page);
    const emptyMsg = await page.locator('.empty-state, .no-tasks').count();
    if (afterDelete > 0) {
      report('BUG-17', 'Не все задачи удаляются', 'High',
        'Удалить все по одной', 'Пустой список', `Осталось ${afterDelete}`);
    }
    if (afterDelete === 0 && emptyMsg === 0) {
      report('BUG-18', 'Нет сообщения при пустом списке', 'Low',
        'Удалить все задачи', 'Placeholder «нет задач»', 'Пустой блок без подсказки');
    }
    await page.reload();
    await page.waitForSelector('.task-item', { timeout: 15000 }).catch(() => {});
    const afterReload = await countTasks(page);
    if (afterReload > 0) {
      // expected — API reloads; note as observation not bug
    }
    await browser.close();
  }

  console.log('\n=== EXPLORATORY FINDINGS ===\n');
  if (findings.length === 0) {
    console.log('Автоматический скрипт не зафиксировал регрессий по порогам. См. ручные заметки в bug-reports.md');
  } else {
    for (const f of findings) {
      console.log(`${f.id} [${f.severity}] ${f.title}`);
      console.log(`  Steps: ${f.steps}`);
      console.log(`  Expected: ${f.expected}`);
      console.log(`  Actual: ${f.actual}\n`);
    }
  }
  return findings;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
