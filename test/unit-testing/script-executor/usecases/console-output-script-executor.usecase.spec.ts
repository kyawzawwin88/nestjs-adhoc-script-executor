import { Test, TestingModule } from '@nestjs/testing';
import {
  ConsoleOutputScriptExecutor,
  ConsoleOutputScriptExecutorParams,
} from '@app/script-executor/usecases/console-output-script-executor.usecase';
import { ScriptExecutorStrategy } from '@app/script-executor/usecases';
import Task, {
  TaskItem,
  TaskItemStatus,
} from '@app/script-executor/domains/task';
import { ITaskDAO } from '@app/script-executor/infrastructures/task.dao';

describe('ConsoleOutputScriptExecutor', () => {
  let service: ConsoleOutputScriptExecutor<any, any>;
  let mockStrategy: ScriptExecutorStrategy<any, any>;

  beforeEach(async () => {
    mockStrategy = {
      transform: jest.fn(),
      validate: jest.fn(),
      dry_run: jest.fn(),
      actual_run: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsoleOutputScriptExecutor,
        {
          provide: ITaskDAO,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConsoleOutputScriptExecutor<any, any>>(
      ConsoleOutputScriptExecutor,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should execute successfully', async () => {
      const params = new ConsoleOutputScriptExecutorParams<any, any>();
      params.strategy = mockStrategy;
      params.name = 'Test';
      params.inputs = [{ test: 'data' }];
      params.is_dry_run = true;

      mockStrategy.transform = jest
        .fn()
        .mockResolvedValue({ transformed: 'data' });
      mockStrategy.validate = jest
        .fn()
        .mockResolvedValue({ validated: 'data' });
      mockStrategy.dry_run = jest.fn().mockResolvedValue({ dry_run: 'data' });
      mockStrategy.verify = jest.fn().mockResolvedValue(true);

      const mocksTask = new Task();
      mocksTask.name = 'test';

      jest.spyOn(service, 'handle').mockResolvedValue([mocksTask]);

      const result = await service.execute('request-id', params);

      expect(result.status_code).toBe(200);
      expect(result.status).toBe('Script executed successfully');
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBeTruthy();
    });

    it('should handle errors', async () => {
      const params = new ConsoleOutputScriptExecutorParams<any, any>();
      params.strategy = mockStrategy;
      params.name = 'Test';
      params.inputs = [{ test: 'data' }];
      params.is_dry_run = true;

      mockStrategy.transform = jest
        .fn()
        .mockRejectedValue(new Error('Test error'));

      const result = await service.execute('request-id', params);

      expect(result.status_code).toBe(500);
      expect(result.status).toBe('Test error');
      expect(result.data).toBeNull();
    });
  });

  describe('transform', () => {
    it('should call strategy transform', async () => {
      const input = { test: 'data' };
      const expectedOutput = { transformed: 'data' };

      service['params'] = {
        strategy: mockStrategy,
      } as ConsoleOutputScriptExecutorParams<any, any>;

      mockStrategy.transform = jest.fn().mockResolvedValue(expectedOutput);

      const result = await service.transform(input);

      expect(mockStrategy.transform).toHaveBeenCalledWith(input);
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('display_output', () => {
    it('should log input, transform and status', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      const mockTask = new Task<string, number>();
      const mockTaskItem = new TaskItem<string, number>();
      mockTaskItem.status = TaskItemStatus.SUCCESS;
      await service.display_output(
        { input: 'data' },
        { transform: 'data' },
        mockTask,
        mockTaskItem,
      );

      expect(logSpy).toHaveBeenCalledTimes(4);
    });
  });
});
