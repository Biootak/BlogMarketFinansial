import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';

// Configure Task List extension
export const TaskListExtension = TaskList.configure({
  HTMLAttributes: {
    class: 'task-list',
  },
});

// Configure Task Item extension
export const TaskItemExtension = TaskItem.configure({
  HTMLAttributes: {
    class: 'task-item',
  },
  nested: true,
});

// Export all task-related extensions
export const taskExtensions = [TaskListExtension, TaskItemExtension];

export default TaskListExtension;
