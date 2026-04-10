/** Dependency-injection token for the raw Mongoose connection handle. */
export const MONGOOSE_CONNECTION = Symbol.for('fluo.mongoose.connection');
/** Dependency-injection token for the optional Mongoose shutdown dispose hook. */
export const MONGOOSE_DISPOSE = Symbol.for('fluo.mongoose.dispose');
/** Dependency-injection token for normalized Mongoose runtime options. */
export const MONGOOSE_OPTIONS = Symbol.for('fluo.mongoose.options');
