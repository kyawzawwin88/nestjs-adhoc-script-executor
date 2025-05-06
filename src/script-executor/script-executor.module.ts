import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ScriptExecutorConfig } from './script-executor.config';
import Task from './domains/task';
import { TaskDAO, TaskDAOSchema, ITaskDAO } from './infrastructures/task.dao';
import { ConsoleOutputScriptExecutor } from './usecases/console-output-script-executor.usecase';
import { CsvOutputScriptExecutor } from './usecases/csv-output-script-executor.usecase';

@Module({
  imports: [
    MongooseModule.forRoot(
      `mongodb://localhost/${ScriptExecutorConfig.connection_name}`,
      {
        connectionName: ScriptExecutorConfig.connection_name,
      },
    ),
    MongooseModule.forFeature(
      [{ name: Task.name, schema: TaskDAOSchema }],
      ScriptExecutorConfig.connection_name,
    ),
  ],
  providers: [
    {
      provide: ITaskDAO,
      useClass: TaskDAO,
    },
    ConsoleOutputScriptExecutor,
    CsvOutputScriptExecutor,
  ],
  exports: [ConsoleOutputScriptExecutor, CsvOutputScriptExecutor],
})
export class ScriptExecutorModule {}
