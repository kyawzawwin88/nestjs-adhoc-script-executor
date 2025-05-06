import mongoose, { Model, Schema, SchemaDefinitionProperty } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import Task, {
  ITask,
  ITaskItem,
  TaskItem,
  TaskItemStatus,
} from '../domains/task';
import { ScriptExecutorConfig } from '../script-executor.config';

export const TaskItemDAOSchema = new mongoose.Schema<
  ITaskItem<Schema.Types.Mixed, Schema.Types.Mixed>
>(
  {
    input_data: { type: Schema.Types.Mixed, required: false },
    transformed_data: { type: Schema.Types.Mixed, required: false },
    remark: { type: String, required: false },
    status: {
      type: String,
      enum: Object.values(TaskItemStatus),
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'tasks',
  },
);

TaskItemDAOSchema.set('toObject', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    const taskItem = new TaskItem();
    Object.assign(taskItem, ret);
    return taskItem;
  },
});

export const TaskDAOSchema = new mongoose.Schema<
  ITask<Schema.Types.Mixed, Schema.Types.Mixed>
>(
  {
    task_group_id: { type: String, required: true },
    name: { type: String, required: true },
    is_dry_run: { type: Boolean, required: true },
    user_id: {
      type: Schema.Types.ObjectId,
      required: false,
    } as unknown as SchemaDefinitionProperty<string>,
    items: [TaskItemDAOSchema],
    completed_at: { type: Date, required: false },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'tasks',
  },
);

TaskDAOSchema.set('toObject', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    const task = new Task();
    Object.assign(task, ret);
    return task;
  },
});

export interface ITaskDAO<I, T> {
  create(task: Partial<Task<I, T>>): Promise<Task<I, T>>;
  addItem(
    taskGroupId: string,
    taskItem: Partial<TaskItem<I, T>>,
  ): Promise<TaskItem<I, T>>;
  updateCompletedAt(
    taskGroupId: string,
    completed_at: Date,
  ): Promise<Array<Task<I, T>>>;
}

export const ITaskDAO = Symbol('ITaskDAO');

@Injectable()
export class TaskDAO<I, T> implements ITaskDAO<I, T> {
  constructor(
    @InjectModel(Task.name, ScriptExecutorConfig.connection_name)
    private readonly taskModel: Model<Task<I, T>>,
  ) {}

  async create(task: Partial<Task<I, T>>): Promise<Task<I, T>> {
    const taskCreated = await this.taskModel.create(task);
    return taskCreated?.toObject() ?? null;
  }

  async addItem(
    taskGroupId: string,
    taskItem: Partial<TaskItem<I, T>>,
  ): Promise<TaskItem<I, T>> {
    const taskUpdated = await this.taskModel
      .findOneAndUpdate(
        {
          task_group_id: taskGroupId,
          'items.199': {
            // max 200 items per document
            $exists: false,
          },
        },
        {
          $push: {
            items: taskItem,
          },
        },
        {
          upsert: true,
        },
      )
      .exec();

    return taskUpdated?.toObject()?.items?.pop() ?? null;
  }

  async updateCompletedAt(
    taskGroupId: string,
    completed_at: Date,
  ): Promise<Array<Task<I, T>>> {
    await this.taskModel
      .updateMany(
        {
          task_group_id: taskGroupId,
        },
        {
          $set: {
            completed_at: completed_at,
          },
        },
      )
      .exec();

    const tasks = await this.taskModel.find({
      task_group_id: taskGroupId,
    });

    return tasks ?? null;
  }
}
