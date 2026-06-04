const { test, expect } = require('@playwright/test');
const { TodoPage } = require('../pages/TodoPage');

test.describe('Todo App Tests', () => {

  let todoPage;

  test.beforeEach(async ({ page }) => {
    todoPage = new TodoPage(page);
    await todoPage.goto();
  });

  test('TC-01: Пользователь может добавить новую задачу', async () => {
    const taskText = 'Купить молоко ' + Date.now();

    await todoPage.addTodo(taskText);

    await expect(todoPage.page.getByText(taskText)).toBeVisible({ timeout: 10000 });
  });

  test('TC-03: Пользователь может отметить задачу как выполненную', async () => {
    const taskText = 'Сделать зарядку ' + Date.now();

    await todoPage.addTodo(taskText);
    await todoPage.toggleTodo(taskText);

    const todoRow = todoPage.todoItem(taskText);
    await expect(todoRow.locator('input.task-checkbox')).toBeChecked();
    await expect(todoRow.locator('.task-title')).toHaveClass(/completed/);
  });

  test('TC-05: Пользователь может удалить задачу', async () => {
    const taskText = 'Удаляемая задача ' + Date.now();
    await todoPage.addTodo(taskText);
    await todoPage.deleteTodo(taskText);

    await expect(todoPage.page.getByText(taskText)).not.toBeVisible();
  });

  test('TC-06: Фильтр Active работает корректно', async () => {
    const taskText = 'Активная задача ' + Date.now();
    await todoPage.addTodo(taskText);
    await todoPage.activeFilter.click();

    await expect(todoPage.page.getByText(taskText)).toBeVisible();
  });

  test('TC-10: После перезагрузки страницы задачи исчезают', async () => {
    const taskText = 'Задача перед релоадом ' + Date.now();
    await todoPage.addTodo(taskText);
    await expect(todoPage.page.getByText(taskText)).toBeVisible();
    await todoPage.page.reload();

    await expect(todoPage.page.getByText(taskText)).not.toBeVisible();
  });

});
