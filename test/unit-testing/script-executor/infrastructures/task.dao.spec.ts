import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TaskDAO } from '@app/script-executor/infrastructures/task.dao';
import Task, {
  TaskItem,
  TaskItemStatus,
} from '@app/script-executor/domains/task';
import { ScriptExecutorConfig } from '@app/script-executor/script-executor.config';

describe('TaskDAO', () => {
  let taskDAO: TaskDAO<any, any>;
  let taskModel: Model<Task<any, any>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskDAO,
        {
          provide: getModelToken(
            Task.name,
            ScriptExecutorConfig.connection_name,
          ),
          useValue: {
            create: jest.fn(),
            findOneAndUpdate: jest.fn(),
            updateMany: jest.fn(),
            find: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    taskDAO = module.get<TaskDAO<any, any>>(TaskDAO);
    taskModel = module.get<Model<Task<any, any>>>(
      getModelToken(Task.name, ScriptExecutorConfig.connection_name),
    );
  });

  describe('create', () => {
    it('should create a task', async () => {
      const mockTask = {
        name: 'Test Task',
        is_dry_run: true,
        task_group_id: '123',
      };
      const mockCreatedTask = {
        ...mockTask,
        toObject: () => mockTask,
      };

      jest.spyOn(taskModel, 'create').mockResolvedValue(mockCreatedTask as any);

      const result = await taskDAO.create(mockTask);

      expect(taskModel.create).toHaveBeenCalledWith(mockTask);
      expect(result).toEqual(mockTask);
    });

    it('should return null if creation fails', async () => {
      jest.spyOn(taskModel, 'create').mockResolvedValue(null);

      const result = await taskDAO.create({});

      expect(result).toBeNull();
    });
  });

  describe('addItem', () => {
    it('should add an item to a task', async () => {
      const mockTaskItem = new TaskItem();
      mockTaskItem.input_data = 'test';
      mockTaskItem.status = TaskItemStatus.SUCCESS;

      const mockUpdatedTask = {
        items: [mockTaskItem],
        toObject: () => ({ items: [mockTaskItem] }),
      };

      jest.spyOn(taskModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUpdatedTask),
      } as any);

      const result = await taskDAO.addItem('123', mockTaskItem);

      expect(taskModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          task_group_id: '123',
          'items.199': { $exists: false },
        },
        {
          $push: { items: mockTaskItem },
        },
        { upsert: true },
      );
      expect(result).toEqual(mockTaskItem);
    });

    it('should return null if update fails', async () => {
      jest.spyOn(taskModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await taskDAO.addItem('123', {});

      expect(result).toBeNull();
    });
  });

  describe('updateCompletedAt', () => {
    it('should update completed_at for tasks', async () => {
      const mockDate = new Date();
      const mockTasks = [
        { task_group_id: '123', completed_at: mockDate },
        { task_group_id: '123', completed_at: mockDate },
      ];

      jest.spyOn(taskModel, 'updateMany').mockReturnValue({
        exec: jest.fn().mockResolvedValue(true),
      } as any);
      jest.spyOn(taskModel, 'find').mockResolvedValue(mockTasks as any);

      const result = await taskDAO.updateCompletedAt('123', mockDate);

      expect(taskModel.updateMany).toHaveBeenCalledWith(
        { task_group_id: '123' },
        { $set: { completed_at: mockDate } },
      );
      expect(taskModel.find).toHaveBeenCalledWith({ task_group_id: '123' });
      expect(result).toEqual(mockTasks);
    });

    it('should return null if no tasks found', async () => {
      jest.spyOn(taskModel, 'updateMany').mockReturnValue({
        exec: jest.fn().mockResolvedValue(true),
      } as any);
      jest.spyOn(taskModel, 'find').mockResolvedValue(null);

      const result = await taskDAO.updateCompletedAt('123', new Date());

      expect(result).toBeNull();
    });
  });
});
