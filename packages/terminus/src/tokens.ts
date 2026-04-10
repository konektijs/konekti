/**
 * Injection token for the list of health indicators registered in Terminus.
 */
export const TERMINUS_HEALTH_INDICATORS = Symbol.for('fluo.terminus.health-indicators');

/**
 * Injection token for the provider tokens of indicators to be resolved from the DI container.
 */
export const TERMINUS_INDICATOR_PROVIDER_TOKENS = Symbol.for('fluo.terminus.indicator-provider-tokens');
