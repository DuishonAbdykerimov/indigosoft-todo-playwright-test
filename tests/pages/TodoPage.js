const { expect } = require('@playwright/test');

class TodoPage{
    constructor(page){
        this.page=page;

        this.taskInput = page.locator('input.task-input');
        this.addButton = page.locator('button.add-button');

        this.allFilter = page.getByRole('button',{name:'All'});
        this.activeFilter = page.getByRole('button', {name:'Active'});
        this.completedFilter = page.getByRole('button', { name: 'Completed' });
        }
        async goto(){
            await this.page.goto('/');
        }
        async addTodo(text){
            await this.taskInput.fill(text);
            await this.addButton.click();
        }
        todoItem(text) {
            return this.page.locator('.task-item').filter({ hasText: text });
        }
        async toggleTodo(text) {
            await this.todoItem(text).locator('input.task-checkbox').check();
        }
        async deleteTodo(text){
            await this.todoItem(text).locator('button.delete-button').click();
        }
        async getAllTodosCount() {
            return await this.page.locator('.task-item').count();
          }
    }
    module.exports = { TodoPage };