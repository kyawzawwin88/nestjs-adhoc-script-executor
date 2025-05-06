import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as moment from 'moment';
import { CsvExampleResponse, IUsecase } from './index';
import { ITask } from '@app/script-executor/domains/task';
import { Order, OrderStatus } from '../domains/order';
import { Delivery, DeliveryStatus } from '../domains/delivery';
import { Payment, PaymentStatus } from '../domains/payment';
import {
  CsvOutputScriptExecutor,
  CsvOutputScriptExecutorParams,
} from '@app/script-executor/usecases/csv-output-script-executor.usecase';
import { ScriptExecutorStrategy } from '@app/script-executor/usecases';
import { faker } from '@faker-js/faker';

interface Input {
  order?: Order;
  delivery?: Delivery;
  payment?: Payment;
}

interface Transform {
  order_id?: string;
  delivery_id?: string;
  payment_id?: string;
  current_order_status: OrderStatus;
  current_delivery_status: DeliveryStatus;
  current_payment_status: PaymentStatus;

  // data to be updated
  new_order_status?: OrderStatus;
  is_order_status_updated?: boolean;

  validation_remark?: string;
  has_pass_validation?: boolean;
}

export class OrderStatusCorrectionCsvStrategy
  implements ScriptExecutorStrategy<Input, Transform>
{
  private readonly logger = new Logger(OrderStatusCorrectionCsvStrategy.name);
  async transform(input: Input): Promise<Transform> {
    this.logger.log(`Transforming input ${JSON.stringify(input)}`);
    const transform: Transform = {
      order_id: input.order?.order_id,
      delivery_id: input.delivery?.delivery_id,
      payment_id: input.payment?.payment_id,
      current_order_status: input.order?.order_status,
      current_delivery_status: input.delivery?.delivery_status,
      current_payment_status: input.payment?.payment_status,
    };
    // not yet updated data. we are still in data pre-processing/transforming stage
    transform.is_order_status_updated = false;

    if (
      input.payment?.payment_status == PaymentStatus.PAID &&
      input.payment?.order_id == input.order?.order_id
    ) {
      // if payment status is paid, new order status should be PAID
      transform.new_order_status = OrderStatus.PAID;
    } else if (
      input.payment?.payment_status == PaymentStatus.REFUNDED &&
      input.payment?.order_id == input.order?.order_id
    ) {
      // if payment status is refunded, new order status should be CANCELLED
      transform.new_order_status = OrderStatus.CANCELLED;
    } else if (
      input.delivery?.delivery_status == DeliveryStatus.DELIVERED &&
      input.delivery?.order_id == input.order?.order_id
    ) {
      // if delivery status is delivered, new order status should be DELIVERED
      transform.new_order_status = OrderStatus.DELIVERED;
    } else if (
      input.delivery?.delivery_status == DeliveryStatus.RETURNED &&
      input.delivery?.order_id == input.order?.order_id
    ) {
      // if payment status is returned, new order status should be CANCELLED
      transform.new_order_status = OrderStatus.CANCELLED;
    }

    return transform;
  }
  async validate(transformedData: Transform): Promise<Transform> {
    this.logger.log(
      `Validating transformed data ${JSON.stringify(transformedData)}`,
    );
    if (!transformedData.order_id) {
      transformedData.validation_remark = 'Order id is empty';
      transformedData.has_pass_validation = false;
    } else if (!transformedData.new_order_status) {
      transformedData.validation_remark = 'New order status is empty';
      transformedData.has_pass_validation = false;
    } else if (
      transformedData.current_order_status == transformedData.new_order_status
    ) {
      transformedData.validation_remark =
        'New order status & existing order status is same';
      transformedData.has_pass_validation = false;
    }

    return transformedData;
  }
  async dry_run(transformedData: Transform): Promise<Transform> {
    this.logger.log(
      `Dry running for transformed data ${JSON.stringify(transformedData)}`,
    );
    // because this is dry run
    transformedData.is_order_status_updated = true;
    return transformedData;
  }
  async actual_run(transformedData: Transform): Promise<Transform> {
    this.logger.log(
      `Actual running for transformed data ${JSON.stringify(transformedData)}`,
    );
    // because this is actual run, we simulate api response true/false for demonstration purpose
    // here is the code block to do actual data updates into database
    if (transformedData.has_pass_validation) {
      // update only if validation is successful
      const simulatedApiResponse = Math.round(Math.random());
      transformedData.is_order_status_updated = simulatedApiResponse == 1;
    }

    return transformedData;
  }
  async verify(transformedData: Transform): Promise<boolean> {
    this.logger.log(
      `Verifying transformed data ${JSON.stringify(transformedData)}`,
    );
    // order status must be updated if validation passed or must not be updated if validation failed,
    return (
      (transformedData.has_pass_validation &&
        transformedData.is_order_status_updated == true) ||
      (!transformedData.has_pass_validation &&
        transformedData.is_order_status_updated == false)
    );
  }
}

@Injectable()
export class OrderStatusCorrectionCsv
  implements
    IUsecase<OrderStatusCorrectionCsvParams, Array<ITask<Input, Transform>>>
{
  private readonly logger = new Logger(OrderStatusCorrectionCsv.name);

  constructor(
    private readonly csvOutputScriptExecutor: CsvOutputScriptExecutor<
      Input,
      Transform
    >,
  ) {}

  async execute(
    requestId: string,
    params: OrderStatusCorrectionCsvParams,
  ): Promise<CsvExampleResponse<Array<ITask<Input, Transform>>>> {
    this.logger.log(`requestId is ${requestId}`);

    const startTime = moment();

    try {
      const csvOutputScriptExecutorParams = new CsvOutputScriptExecutorParams<
        Input,
        Transform
      >();
      csvOutputScriptExecutorParams.strategy =
        new OrderStatusCorrectionCsvStrategy();
      csvOutputScriptExecutorParams.name = OrderStatusCorrectionCsv.name;
      csvOutputScriptExecutorParams.inputs = this.getInputs();
      csvOutputScriptExecutorParams.is_dry_run = params.is_dry_run;
      const result = await this.csvOutputScriptExecutor.execute(
        requestId,
        csvOutputScriptExecutorParams,
      );

      const endTime = moment();
      return {
        status_code: HttpStatus.CREATED,
        status: 'Order status data corrected successfully',
        time_taken_in_ms: endTime.diff(startTime, 'milliseconds'),
        data: result.data,
      };
    } catch (error) {
      const endTime = moment();
      return {
        status_code: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        status: error.message,
        time_taken_in_ms: endTime.diff(startTime, 'milliseconds'),
        data: null,
      };
    }
  }

  // input data simulator. in real world, we should get input from database or external data sources
  getInputs(): Array<Input> {
    const inputs: Array<Input> = [];

    const orderStatusValues = Object.values(OrderStatus);
    const deliveryStatusValues = Object.values(DeliveryStatus);
    const paymentStatusValues = Object.values(PaymentStatus);

    for (let i = 0; i < 1000; i++) {
      const randomOrderStatusIndex = Math.floor(
        Math.random() * orderStatusValues.length,
      );
      const randomDeliveryStatusIndex = Math.floor(
        Math.random() * deliveryStatusValues.length,
      );
      const randomPaymentStatusIndex = Math.floor(
        Math.random() * paymentStatusValues.length,
      );

      const order_id = faker.database.mongodbObjectId();
      inputs.push({
        order: {
          order_id: order_id,
          order_status: orderStatusValues[randomOrderStatusIndex],
        },
        delivery: {
          order_id: order_id,
          delivery_id: faker.database.mongodbObjectId(),
          delivery_status: deliveryStatusValues[randomDeliveryStatusIndex],
        },
        payment: {
          order_id: order_id,
          payment_id: faker.database.mongodbObjectId(),
          payment_status: paymentStatusValues[randomPaymentStatusIndex],
        },
      });
    }
    return inputs;
  }
}

export interface OrderStatusCorrectionCsvParams {
  is_dry_run?: boolean;
}
