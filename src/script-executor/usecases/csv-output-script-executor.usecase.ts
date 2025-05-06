import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as moment from 'moment';
import {
  IUsecase,
  ScriptExecutorResponse,
  ScriptExecutorStrategy,
  ScriptExecutorTemplate,
} from './index';
import Task, { TaskItem } from '../domains/task';
import * as fs from 'fs-extra';
import * as path from 'path';
import { unparse } from 'papaparse';

@Injectable()
export class CsvOutputScriptExecutor<I, T>
  extends ScriptExecutorTemplate<I, T>
  implements IUsecase<CsvOutputScriptExecutorParams<I, T>, Array<Task<I, T>>>
{
  private readonly logger = new Logger(CsvOutputScriptExecutor.name);
  private params: CsvOutputScriptExecutorParams<I, T>;

  constructor() {
    super();
  }

  async transform(input: I): Promise<T> {
    return await this.params.strategy.transform(input);
  }
  async validate(transformedData: T): Promise<T> {
    return await this.params.strategy.validate(transformedData);
  }
  async dry_run(transformedData: T): Promise<T> {
    return await this.params.strategy.dry_run(transformedData);
  }
  async actual_run(transformedData: T): Promise<T> {
    return await this.params.strategy.actual_run(transformedData);
  }
  async verify(transformedData: T): Promise<boolean> {
    return await this.params.strategy.verify(transformedData);
  }
  async display_output(
    input: I,
    transformedData: T,
    task: Task<I, T>,
    taskItem: TaskItem<I, T>,
  ): Promise<void> {
    this.logger.log(`INPUT ${JSON.stringify(input)}`);
    const outputDir = `${process.cwd()}/output`;
    const filename = `output_${task.task_group_id}.csv`;
    const filePath = path.join(outputDir, filename);
    await fs.ensureDir(path.dirname(filePath));

    let header = true;
    const fileExists = await fs.pathExists(filePath);

    if (fileExists) {
      header = false;
    }

    const newObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(transformedData)) {
      newObj[key] = value;
    }

    newObj['status'] = taskItem.status;

    const csv = unparse([newObj], {
      header: header,
    });

    if (!header) {
      await fs.appendFile(filePath, csv + '\n');
    } else {
      await fs.writeFile(filePath, csv + '\n');
    }
  }
  async execute(
    requestId: string,
    params?: CsvOutputScriptExecutorParams<I, T>,
  ): Promise<ScriptExecutorResponse<Array<Task<I, T>>>> {
    this.logger.log(`requestId is ${requestId}`);
    const startTime = moment();
    this.params = params;

    try {
      const tasks = await this.handle(
        requestId,
        params.name,
        params.user_id,
        params.inputs,
        params.is_dry_run,
      );

      const endTime = moment();
      return {
        status_code: HttpStatus.OK,
        status: 'Script executed successfully',
        time_taken_in_ms: endTime.diff(startTime, 'milliseconds'),
        data: tasks,
      };
    } catch (error) {
      const endTime = moment();
      return {
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
        status: error.message,
        time_taken_in_ms: endTime.diff(startTime, 'milliseconds'),
        data: null,
      };
    }
  }
}

export class CsvOutputScriptExecutorParams<I, T> {
  strategy: ScriptExecutorStrategy<I, T>;
  name: string;
  user_id: string;
  inputs: Array<I>;
  is_dry_run: boolean;
}
