import { Module } from '@nestjs/common';
import { ConsoleExampleModule } from './console-example/console-example.module';
import { ScriptExecutorModule } from './script-executor/script-executor.module';
import { CsvExampleModule } from './csv-example/csv-example.module';

@Module({
  imports: [ScriptExecutorModule, ConsoleExampleModule, CsvExampleModule],
})
export class AppModule {}
