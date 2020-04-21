"use strict";
/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
exports.__esModule = true;
/**
 * The global verbosity level for Magenta.js.
 */
exports.verbosity = 10 /* INFO */;
/**
 * Logs a message at the given verbosity level.
 *
 * If `level` is below the global `verbosity` level, the message is ignored.
 *
 * @param msg The message to log.
 * @param prefix The prefix of the message, should specify the model or library
 * that is doing the logging.
 * @param level The verbosity level of the message. The message will not be
 * logged if this level is greater than the `verbosity` setting.
 */
function log(msg, prefix, level) {
    if (prefix === void 0) { prefix = 'Magenta.js'; }
    if (level === void 0) { level = 10 /* INFO */; }
    if (level === 0 /* NONE */) {
        throw Error('Logging level cannot be NONE.');
    }
    if (exports.verbosity >= level) {
        var logMethod = (level === 5 /* WARN */) ? console.warn : console.log;
        logMethod("%c " + prefix + " ", 'background:magenta; color:white', msg);
    }
}
exports.log = log;
/**
 * Logs a message at the given verbosity level, with the duration.
 *
 * If `level` is below the global `verbosity` level, the message is ignored.
 *
 * @param msg The message to log.
 * @param startTime The start time to use for duration calculation, in ms.
 * @param prefix The prefix of the message, should specify the model or library
 * that is doing the logging.
 * @param level The verbosity level of the message. The message will not be
 * logged if this level is greater than the `verbosity` setting.
 */
function logWithDuration(msg, startTime, prefix, level) {
    if (prefix === void 0) { prefix = 'Magenta.js'; }
    if (level === void 0) { level = 10 /* INFO */; }
    var durationSeconds = (performance.now() - startTime) / 1000;
    log(msg + " in " + durationSeconds.toPrecision(3) + "s", prefix, level);
}
exports.logWithDuration = logWithDuration;
