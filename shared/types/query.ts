export interface EventQueryOptions {
  /** Include past events (closing_date < today). NULL closing_date = never expires. Default: false */
  pastToo?: boolean;
  /** Include canceled events. Default: false */
  canceledToo?: boolean;
}

export interface PerformanceQueryOptions {
  /** Include past performances (performance_date < today). Default: false */
  pastToo?: boolean;
  /** Include performances with status = 'canceled'. Default: false */
  canceledToo?: boolean;
}
