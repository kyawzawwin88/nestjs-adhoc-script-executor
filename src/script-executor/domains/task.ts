export enum TaskItemStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface ITaskItem<I, T> {
  input_data: I;
  transformed_data: T;
  remark?: string;
  status: TaskItemStatus;
}

export interface ITask<I, T> {
  task_group_id: string;
  name: string;
  is_dry_run: boolean;
  user_id?: string;
  items: Array<ITaskItem<I, T>>;
  completed_at: Date;
}

export class TaskItem<I, T> implements ITaskItem<I, T> {
  id: string;
  input_data: I;
  transformed_data: T;
  remark?: string;
  status: TaskItemStatus;
  created_at: Date;
  updated_at: Date;
}

export default class Task<I, T> implements ITask<I, T> {
  id: string;
  task_group_id: string;
  name: string;
  is_dry_run: boolean;
  user_id?: string;
  items: Array<TaskItem<I, T>>;
  completed_at: Date;
  created_at: Date;
  updated_at: Date;
}
