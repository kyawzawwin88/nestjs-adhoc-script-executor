export type ConsoleExampleResponse<R> = {
  status_code: number;
  status: string;
  time_taken_in_ms: number;
  data: R;
};

export interface IUsecase<P, R> {
  execute(request_id: string, params?: P): Promise<ConsoleExampleResponse<R>>;
}
