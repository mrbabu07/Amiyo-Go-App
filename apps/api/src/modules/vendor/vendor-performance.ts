export type VendorPerformanceInput = {
  orderCount: number;
  deliveredCount: number;
  cancelledCount: number;
  rejectedCount: number;
  returnCount: number;
  dispatchSlaHours: number;
  dispatchRows: Array<{ createdAt: Date; shippedAt: Date | null }>;
  rating: number;
  ratingCount: number;
};

const roundOne = (value: number) => Number(value.toFixed(1));
function metricState(value: number, target: number, higherIsBetter: boolean, sampleSize: number) {
  if (!sampleSize) return "not_enough_data" as const;
  const distance = higherIsBetter ? value - target : target - value;
  if (distance >= 0) return "healthy" as const;
  if (distance >= (higherIsBetter ? -10 : -3)) return "watch" as const;
  return "action_required" as const;
}

export function buildVendorPerformance(input: VendorPerformanceInput) {
  const fulfilmentRate = input.orderCount ? roundOne((input.deliveredCount / input.orderCount) * 100) : 0;
  const cancellationRate = input.orderCount ? roundOne(((input.cancelledCount + input.rejectedCount) / input.orderCount) * 100) : 0;
  const returnRate = input.deliveredCount ? roundOne((input.returnCount / input.deliveredCount) * 100) : 0;
  const onTimeDispatchCount = input.dispatchRows.filter((row) => row.shippedAt && row.shippedAt.getTime() <= row.createdAt.getTime() + input.dispatchSlaHours * 60 * 60_000).length;
  const onTimeDispatchRate = input.dispatchRows.length ? roundOne((onTimeDispatchCount / input.dispatchRows.length) * 100) : 0;
  const rating = roundOne(input.rating);
  const score = input.orderCount < 5 ? 0 : Math.round(Math.max(0, Math.min(100, fulfilmentRate * .35 + Math.max(0, 100 - cancellationRate * 5) * .2 + Math.max(0, 100 - returnRate * 5) * .2 + onTimeDispatchRate * .15 + (rating / 5) * 10)));
  const recommendations = [
    ...(fulfilmentRate < 90 && input.orderCount ? ["Complete accepted orders consistently to keep fulfilment above 90%."] : []),
    ...(cancellationRate > 5 ? ["Keep inventory current and accept only orders you can fulfil."] : []),
    ...(returnRate > 5 ? ["Review return reasons and improve listing accuracy or packaging."] : []),
    ...(onTimeDispatchRate < 90 && input.dispatchRows.length ? [`Hand parcels over within ${input.dispatchSlaHours} hours of order creation.`] : []),
    ...(rating < 4.2 && input.ratingCount ? ["Reply to reviews and resolve recurring product-quality concerns."] : [])
  ].slice(0, 5);
  return {
    score, tier: input.orderCount < 5 ? "new_seller" as const : score >= 90 ? "excellent" as const : score >= 75 ? "good" as const : "needs_attention" as const, dispatchSlaHours: input.dispatchSlaHours,
    fulfilment: { value: fulfilmentRate, target: 90, sampleSize: input.orderCount, state: metricState(fulfilmentRate, 90, true, input.orderCount) },
    cancellation: { value: cancellationRate, target: 5, sampleSize: input.orderCount, state: metricState(cancellationRate, 5, false, input.orderCount) },
    returns: { value: returnRate, target: 5, sampleSize: input.deliveredCount, state: metricState(returnRate, 5, false, input.deliveredCount) },
    onTimeDispatch: { value: onTimeDispatchRate, target: 90, sampleSize: input.dispatchRows.length, state: metricState(onTimeDispatchRate, 90, true, input.dispatchRows.length) },
    rating: { value: rating, target: 4.2, sampleSize: input.ratingCount, state: metricState(rating, 4.2, true, input.ratingCount) }, recommendations
  };
}
