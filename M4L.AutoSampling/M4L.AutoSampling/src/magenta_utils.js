"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
/**
 * Utiltities for loading audio and computing mel spectrograms, based on
 * {@link https://github.com/magenta/magenta-js/blob/master/music/src/core/audio_utils.ts}.
 *
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
//@ts-ignore
var FFT = require("fft.js");
var ndarray = require("ndarray");
var resample = require("ndarray-resample");
var audioload = require('audio-loader');
var SAMPLE_RATE = 16000;
/**
 * Loads audio into AudioBuffer from a URL to transcribe.
 *
 * By default, audio is loaded at 16kHz monophonic for compatibility with
 * model. In Safari, audio must be loaded at 44.1kHz instead.
 *
 * @param url A path to a audio file to load.
 * @returns The loaded audio in an AudioBuffer.
 */
// export async function loadAudioFromUrl(url: string): Promise<AudioBuffer> {
//   return fetch(url)
//       .then(body => body.arrayBuffer())
//       .then(buffer => offlineCtx.decodeAudioData(buffer));
// }
/**
 * Loads audio into AudioBuffer from a Blob to transcribe.
 *
 * By default, audio is loaded at 16kHz monophonic for compatibility with
 * model. In Safari, audio must be loaded at 44.1kHz instead.
 *
 * @param url A path to a audio file to load.
 * @returns The loaded audio in an AudioBuffer.
 */
function loadAudioFromFile(blob) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, audioload(blob)];
        });
    });
}
exports.loadAudioFromFile = loadAudioFromFile;
function getMonoAudio(audioBuffer) {
    if (audioBuffer.numberOfChannels === 1) {
        return audioBuffer.getChannelData(0);
    }
    if (audioBuffer.numberOfChannels !== 2) {
        throw Error(audioBuffer.numberOfChannels + " channel audio is not supported.");
    }
    var ch0 = audioBuffer.getChannelData(0);
    var ch1 = audioBuffer.getChannelData(1);
    var mono = new Float32Array(audioBuffer.length);
    for (var i = 0; i < audioBuffer.length; ++i) {
        mono[i] = (ch0[i] + ch1[i]) / 2;
    }
    return mono;
}
function resampleAndMakeMono(audioBuffer, targetSr) {
    if (targetSr === void 0) { targetSr = SAMPLE_RATE; }
    return __awaiter(this, void 0, void 0, function () {
        var sourceSr, lengthRes, originalAudio, resampledAudio;
        return __generator(this, function (_a) {
            if (audioBuffer.sampleRate === targetSr) {
                return [2 /*return*/, getMonoAudio(audioBuffer)];
            }
            sourceSr = audioBuffer.sampleRate;
            lengthRes = audioBuffer.length * targetSr / sourceSr;
            originalAudio = getMonoAudio(audioBuffer);
            resampledAudio = new Float32Array(lengthRes);
            resample(ndarray(resampledAudio, [lengthRes]), ndarray(originalAudio, [originalAudio.length]));
            return [2 /*return*/, resampledAudio];
        });
    });
}
exports.resampleAndMakeMono = resampleAndMakeMono;
function melSpectrogram(y, params) {
    if (!params.power) {
        params.power = 2.0;
    }
    var stftMatrix = stft(y, params);
    var _a = magSpectrogram(stftMatrix, params.power), spec = _a[0], nFft = _a[1];
    params.nFft = nFft;
    var melBasis = createMelFilterbank(params);
    return applyWholeFilterbank(spec, melBasis);
}
exports.melSpectrogram = melSpectrogram;
/**
 * Convert a power spectrogram (amplitude squared) to decibel (dB) units
 *
 * Intended to match {@link
 * https://librosa.github.io/librosa/generated/librosa.core.power_to_db.html
 * librosa.core.power_to_db}
 * @param spec Input power.
 * @param amin Minimum threshold for `abs(S)`.
 * @param topDb Threshold the output at `topDb` below the peak.
 */
function powerToDb(spec, amin, topDb) {
    if (amin === void 0) { amin = 1e-8; }
    if (topDb === void 0) { topDb = 80.0; }
    var width = spec.length;
    var height = spec[0].length;
    var logSpec = [];
    for (var i = 0; i < width; i++) {
        logSpec[i] = new Float32Array(height);
    }
    var maxVal = -topDb;
    for (var i = 0; i < width; i++) {
        for (var j = 0; j < height; j++) {
            var val = spec[i][j];
            logSpec[i][j] = 10.0 * Math.log10(Math.max(amin, val));
            if (logSpec[i][j] > maxVal)
                maxVal = logSpec[i][j];
        }
    }
    if (topDb) {
        if (topDb < 0) {
            throw new Error("topDb must be non-negative.");
        }
        for (var i = 0; i < width; i++) {
            // const maxVal = max(logSpec[i]);  // original code
            for (var j = 0; j < height; j++) {
                logSpec[i][j] = Math.max(logSpec[i][j] - maxVal, -topDb);
                // logSpec[i][j] = Math.max(logSpec[i][j], maxVal - topDb); // original code
            }
        }
    }
    return logSpec;
}
exports.powerToDb = powerToDb;
function magSpectrogram(stft, power) {
    var spec = stft.map(function (fft) { return pow(mag(fft), power); });
    var nFft = stft[0].length - 1;
    return [spec, nFft];
}
function stft(y, params) {
    var nFft = params.nFft || 2048;
    var winLength = params.winLength || nFft;
    var hopLength = params.hopLength || Math.floor(winLength / 4);
    var fftWindow = hannWindow(winLength);
    // Pad the window to be the size of nFft.
    fftWindow = padCenterToLength(fftWindow, nFft);
    // Pad the time series so that the frames are centered.
    y = padReflect(y, Math.floor(nFft / 2));
    // Window the time series.
    var yFrames = frame(y, nFft, hopLength);
    // Pre-allocate the STFT matrix.
    var stftMatrix = [];
    var width = yFrames.length;
    var height = nFft + 2;
    for (var i = 0; i < width; i++) {
        // Each column is a Float32Array of size height.
        var col = new Float32Array(height);
        stftMatrix[i] = col;
    }
    for (var i = 0; i < width; i++) {
        // Populate the STFT matrix.
        var winBuffer = applyWindow(yFrames[i], fftWindow);
        var col = fft(winBuffer);
        stftMatrix[i].set(col.slice(0, height));
    }
    return stftMatrix;
}
function applyWholeFilterbank(spec, filterbank) {
    // Apply a point-wise dot product between the array of arrays.
    var out = [];
    for (var i = 0; i < spec.length; i++) {
        out[i] = applyFilterbank(spec[i], filterbank);
    }
    return out;
}
function applyFilterbank(mags, filterbank) {
    if (mags.length !== filterbank[0].length) {
        throw new Error("Each entry in filterbank should have dimensions " +
            ("matching FFT. |mags| = " + mags.length + ", ") +
            ("|filterbank[0]| = " + filterbank[0].length + "."));
    }
    // Apply each filter to the whole FFT signal to get one value.
    var out = new Float32Array(filterbank.length);
    for (var i = 0; i < filterbank.length; i++) {
        // To calculate filterbank energies we multiply each filterbank with the
        // power spectrum.
        var win = applyWindow(mags, filterbank[i]);
        // Then add up the coefficents.
        out[i] = win.reduce(function (a, b) { return a + b; });
    }
    return out;
}
function applyWindow(buffer, win) {
    if (buffer.length !== win.length) {
        console.error("Buffer length " + buffer.length + " != window length " + win.length + ".");
        return null;
    }
    var out = new Float32Array(buffer.length);
    for (var i = 0; i < buffer.length; i++) {
        out[i] = win[i] * buffer[i];
    }
    return out;
}
exports.applyWindow = applyWindow;
function padCenterToLength(data, length) {
    // If data is longer than length, error!
    if (data.length > length) {
        throw new Error('Data is longer than length.');
    }
    var paddingLeft = Math.floor((length - data.length) / 2);
    var paddingRight = length - data.length - paddingLeft;
    return padConstant(data, [paddingLeft, paddingRight]);
}
exports.padCenterToLength = padCenterToLength;
function padConstant(data, padding) {
    var padLeft, padRight;
    if (typeof (padding) === 'object') {
        padLeft = padding[0], padRight = padding[1];
    }
    else {
        padLeft = padRight = padding;
    }
    var out = new Float32Array(data.length + padLeft + padRight);
    out.set(data, padLeft);
    return out;
}
exports.padConstant = padConstant;
function padReflect(data, padding) {
    var out = padConstant(data, padding);
    for (var i = 0; i < padding; i++) {
        // Pad the beginning with reflected values.
        out[i] = out[2 * padding - i];
        // Pad the end with reflected values.
        out[out.length - i - 1] = out[out.length - 2 * padding + i - 1];
    }
    return out;
}
/**
 * Given a timeseries, returns an array of timeseries that are windowed
 * according to the params specified.
 */
function frame(data, frameLength, hopLength) {
    var bufferCount = Math.floor((data.length - frameLength) / hopLength) + 1;
    var buffers = Array.from({ length: bufferCount }, function (x, i) { return new Float32Array(frameLength); });
    for (var i = 0; i < bufferCount; i++) {
        var ind = i * hopLength;
        var buffer = data.slice(ind, ind + frameLength);
        buffers[i].set(buffer);
        // In the end, we will likely have an incomplete buffer, which we should
        // just ignore.
        if (buffer.length !== frameLength) {
            continue;
        }
    }
    return buffers;
}
exports.frame = frame;
function createMelFilterbank(params) {
    var fMin = params.fMin || 0;
    var fMax = params.fMax || params.sampleRate / 2;
    var nMels = params.nMels || 128;
    var nFft = params.nFft || 2048;
    // Center freqs of each FFT band.
    var fftFreqs = calculateFftFreqs(params.sampleRate, nFft);
    // (Pseudo) center freqs of each Mel band.
    var melFreqs = calculateMelFreqs(nMels + 2, fMin, fMax);
    var melDiff = internalDiff(melFreqs);
    var ramps = outerSubtract(melFreqs, fftFreqs);
    var filterSize = ramps[0].length;
    var weights = [];
    for (var i = 0; i < nMels; i++) {
        weights[i] = new Float32Array(filterSize);
        for (var j = 0; j < ramps[i].length; j++) {
            var lower = -ramps[i][j] / melDiff[i];
            var upper = ramps[i + 2][j] / melDiff[i + 1];
            var weight = Math.max(0, Math.min(lower, upper));
            weights[i][j] = weight;
        }
    }
    var _loop_1 = function (i) {
        // How much energy per channel.
        var enorm = 2.0 / (melFreqs[2 + i] - melFreqs[i]);
        // Normalize by that amount.
        weights[i] = weights[i].map(function (val) { return val * enorm; });
    };
    // Slaney-style mel is scaled to be approx constant energy per channel.
    for (var i = 0; i < weights.length; i++) {
        _loop_1(i);
    }
    return weights;
}
function fft(y) {
    var fft = new FFT(y.length);
    var out = fft.createComplexArray();
    var data = fft.toComplexArray(y);
    fft.transform(out, data);
    return out;
}
function hannWindow(length) {
    var win = new Float32Array(length);
    for (var i = 0; i < length; i++) {
        win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (length - 1)));
    }
    return win;
}
exports.hannWindow = hannWindow;
function linearSpace(start, end, count) {
    // Include start and endpoints.
    var delta = (end - start) / (count - 1);
    var out = new Float32Array(count);
    for (var i = 0; i < count; i++) {
        out[i] = start + delta * i;
    }
    return out;
}
/**
 * Given an interlaced complex array (y_i is real, y_(i+1) is imaginary),
 * calculates the energies. Output is half the size.
 */
function mag(y) {
    var out = new Float32Array(y.length / 2);
    for (var i = 0; i < y.length / 2; i++) {
        out[i] = Math.sqrt(y[i * 2] * y[i * 2] + y[i * 2 + 1] * y[i * 2 + 1]);
    }
    return out;
}
function hzToMel(hz) {
    return 1125.0 * Math.log(1 + hz / 700.0);
}
function melToHz(mel) {
    return 700.0 * (Math.exp(mel / 1125.0) - 1);
}
function calculateFftFreqs(sampleRate, nFft) {
    return linearSpace(0, sampleRate / 2, Math.floor(1 + nFft / 2));
}
function calculateMelFreqs(nMels, fMin, fMax) {
    var melMin = hzToMel(fMin);
    var melMax = hzToMel(fMax);
    // Construct linearly spaced array of nMel intervals, between melMin and
    // melMax.
    var mels = linearSpace(melMin, melMax, nMels);
    var hzs = mels.map(function (mel) { return melToHz(mel); });
    return hzs;
}
function internalDiff(arr) {
    var out = new Float32Array(arr.length - 1);
    for (var i = 0; i < arr.length; i++) {
        out[i] = arr[i + 1] - arr[i];
    }
    return out;
}
function outerSubtract(arr, arr2) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
        out[i] = new Float32Array(arr2.length);
    }
    for (var i = 0; i < arr.length; i++) {
        for (var j = 0; j < arr2.length; j++) {
            out[i][j] = arr[i] - arr2[j];
        }
    }
    return out;
}
function pow(arr, power) {
    return arr.map(function (v) { return Math.pow(v, power); });
}
function max(arr) {
    return arr.reduce(function (a, b) { return Math.max(a, b); });
}
// export async function preprocessAudio(audioBuffer: AudioBuffer) {
//   const resampledMonoAudio = await resampleAndMakeMono(audioBuffer);
//   return powerToDb(melSpectrogram(resampledMonoAudio, {
//     sampleRate: 16000,
//     hopLength: 256,
//     nMels: 128,
//     nFft: 1024,
//     fMin: 0,
//   }));
// }
