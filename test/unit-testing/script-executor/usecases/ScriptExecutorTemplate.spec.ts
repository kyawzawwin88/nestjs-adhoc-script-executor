import { Test, TestingModule } from '@nestjs/testing';
import { ScriptExecutorTemplate } from '@app/script-executor/usecases';
import { ITaskDAO } from '@app/script-executor/infrastructures/task.dao';
import Task, {
  TaskItem,
  TaskItemStatus,
} from '@app/script-executor/domains/task';
import { faker } from '@faker-js/faker';

class TestScriptExecutor extends ScriptExecutorTemplate<string, number> {
  async transform(input: string): Promise<number> {
    return parseInt(input);
  }
  async validate(transformedData: number): Promise<number> {
    return transformedData;
  }
  async dry_run(transformedData: number): Promise<number> {
    return transformedData;
  }
  async actual_run(transformedData: number): Promise<number> {
    return transformedData;
  }
  async verify(transformedData: number): Promise<boolean> {
    return !isNaN(transformedData);
  }
  async display_output(
    input: string,
    transformedData: number,
    task: Task<string, number>,
    taskItem: TaskItem<string, number>,
  ): Promise<void> {
    // Do nothing
    console.log(input);
    console.log(transformedData);
    console.log(task);
    console.log(taskItem);
  }
}

describe('ScriptExecutorTemplate', () => {
  let executor: TestScriptExecutor;
  let mockTaskDAO: jest.Mocked<ITaskDAO<string, number>>;

  beforeEach(async () => {
    mockTaskDAO = {
      create: jest.fn(),
      addItem: jest.fn(),
      updateCompletedAt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestScriptExecutor,
        {
          provide: ITaskDAO,
          useValue: mockTaskDAO,
        },
      ],
    }).compile();

    executor = module.get<TestScriptExecutor>(TestScriptExecutor);
  });

  describe('handle', () => {
    it('should process inputs and create tasks successfully', async () => {
      const mockTask = new Task<string, number>();
      const mockTaskItem = new TaskItem<string, number>();
      const mockTasks = [mockTask];

      mockTaskDAO.create.mockResolvedValue(mockTask);
      mockTaskDAO.addItem.mockResolvedValue(mockTaskItem);
      mockTaskDAO.updateCompletedAt.mockResolvedValue(mockTasks);

      const result = await executor.handle(
        'request-123',
        'Test Script',
        'user-123',
        ['123', '456'],
        false,
      );

      expect(mockTaskDAO.create).toHaveBeenCalledTimes(1);
      expect(mockTaskDAO.addItem).toHaveBeenCalledTimes(2);
      expect(mockTaskDAO.updateCompletedAt).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTasks);
    });

    it('should handle dry run mode', async () => {
      const mockTask = new Task<string, number>();
      const mockTaskItem = new TaskItem<string, number>();
      const mockTasks = [mockTask];

      mockTaskDAO.create.mockResolvedValue(mockTask);
      mockTaskDAO.addItem.mockResolvedValue(mockTaskItem);
      mockTaskDAO.updateCompletedAt.mockResolvedValue(mockTasks);

      const result = await executor.handle(
        'request-123',
        'Test Script',
        'user-123',
        ['123'],
        true,
      );

      expect(mockTaskDAO.create).toHaveBeenCalledTimes(1);
      expect(mockTaskDAO.addItem).toHaveBeenCalledTimes(1);
      expect(mockTaskDAO.updateCompletedAt).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTasks);
    });

    it('should mark task as error when verification fails', async () => {
      const mockTask = new Task<string, number>();
      mockTask.task_group_id = faker.string.uuid();
      const mockTaskItem = new TaskItem<string, number>();
      const mockTasks = [mockTask];

      mockTaskDAO.create.mockResolvedValue(mockTask);
      mockTaskDAO.addItem.mockResolvedValue(mockTaskItem);
      mockTaskDAO.updateCompletedAt.mockResolvedValue(mockTasks);

      const result = await executor.handle(
        'request-123',
        'Test Script',
        'user-123',
        ['invalid'],
        false,
      );

      expect(mockTaskDAO.addItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: TaskItemStatus.ERROR,
        }),
      );
      expect(result).toEqual(mockTasks);
    });
  });
});
