import { Inject, Injectable, Logger } from '@nestjs/common';
import { ITaskDAO } from '../infrastructures/task.dao';
import Task, { TaskItem, TaskItemStatus } from '../domains/task';
import * as moment from 'moment';
import { v4 as uuidv4 } from 'uuid';

export interface IUsecase<P, R> {
  execute(requestId: string, params?: P): Promise<ScriptExecutorResponse<R>>;
}

export interface ScriptExecutorStrategy<I, T> {
  transform(input: I): Promise<T>;
  validate(transformedData: T): Promise<T>;
  dry_run(transformedData: T): Promise<T>;
  actual_run(transformedData: T): Promise<T>;
  verify(transformedData: T): Promise<boolean>;
}

@Injectable()
export abstract class ScriptExecutorTemplate<I, T>
  implements ScriptExecutorStrategy<I, T>
{
  private readonly template_logger = new Logger(ScriptExecutorTemplate.name);

  @Inject(ITaskDAO)
  private readonly taskDAO: ITaskDAO<I, T>;

  async handle(
    requestId: string,
    name: string,
    user_id: string,
    inputs: Array<I>,
    is_dry_run: boolean,
  ): Promise<Array<Task<I, T>>> {
    this.template_logger.log(`requestId is ${requestId}`);

    const task = new Task<I, T>();
    task.task_group_id = uuidv4();
    task.name = name;
    task.is_dry_run = is_dry_run;
    task.user_id = user_id;

    const taskCreated = await this.taskDAO.create(task);
    for (const input of inputs) {
      let transform = await this.transform(input);
      transform = await this.validate(transform);

      if (is_dry_run) {
        transform = await this.dry_run(transform);
      } else {
        transform = await this.actual_run(transform);
      }
      const result = await this.verify(transform);

      const taskItem = new TaskItem<I, T>();
      taskItem.input_data = input;
      taskItem.transformed_data = transform;
      taskItem.status = result ? TaskItemStatus.SUCCESS : TaskItemStatus.ERROR;
      await this.taskDAO.addItem(taskCreated.task_group_id, taskItem);

      await this.display_output(input, transform, task, taskItem);
    }

    const completed_at = moment().toDate();
    const tasks = await this.taskDAO.updateCompletedAt(
      taskCreated.task_group_id,
      completed_at,
    );
    return tasks;
  }

  abstract transform(input: I): Promise<T>;
  abstract validate(transformedData: T): Promise<T>;
  abstract dry_run(transformedData: T): Promise<T>;
  abstract actual_run(transformedData: T): Promise<T>;
  abstract verify(transformedData: T): Promise<boolean>;
  abstract display_output(
    input: I,
    transformedData: T,
    task: Task<I, T>,
    taskItem: TaskItem<I, T>,
  ): Promise<void>;
}

export type ScriptExecutorResponse<R> = {
  status_code: number;
  status: string;
  time_taken_in_ms: number;
  data: R;
};
