
const magenta_utils = require('./magenta_utils');
const createBuffer = require('audio-buffer-from');

const MODEL_SR = require('./constants.js').MODEL_SR;
const MODEL_HOP_SIZE = require('./constants.js').MODEL_HOP_SIZE;
const MODEL_FFT_SIZE = require('./constants.js').MODEL_FFT_SIZE;
const MODEL_MEL_LENGTH = require('./constants.js').MODEL_MEL_LENGTH;
const MODEL_MEL_NUM = require('./constants.js').MODEL_MEL_NUM;

// var MODEL_INPUT_AUDIO_SEC = MODEL_HOP_SIZE/TARGET_SR * MODEL_MEL_LENGTH;
var MODEL_INPUT_SAMPLES  = MODEL_HOP_SIZE * (MODEL_MEL_LENGTH - 1) + MODEL_FFT_SIZE; 

function getMonoAudio(audioBuffer) {
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }
    if (audioBuffer.numberOfChannels !== 2) {
      throw Error(
          `${audioBuffer.numberOfChannels} channel audio is not supported.`);
    }
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.getChannelData(1);
  
    const mono = new Float32Array(audioBuffer.length);
    for (let i = 0; i < audioBuffer.length; ++i) {
      mono[i] = (ch0[i] + ch1[i]) / 2;
    }
    return mono;
}

async function loadResampleAndMakeMono(filepath, targetSR){
    var buffer = await magenta_utils.loadAudioFromFile(filepath); // AudioBuffer
    var resampledBuffer = createBuffer(buffer,  {rate: targetSR}); // resampled AudioBuffer
    var monoBuffer = getMonoAudio(resampledBuffer);  // FloatArry
    return monoBuffer;
}

function getMelspectrogram(resampledMonoAudio, sampleRate, fftSize, hopSize, melCount) {
    return magenta_utils.powerToDb(magenta_utils.melSpectrogram(resampledMonoAudio, {
      sampleRate: sampleRate,
      hopLength: hopSize,
      nMels: melCount,
      nFft: fftSize,
      fMin: 0,
    }));
  }

function getMelspectrogramForClassification(resampledMonoAudio, startMs, endMs, sampleRate=MODEL_SR, 
                                        fftSize=MODEL_FFT_SIZE, hopSize=MODEL_HOP_SIZE, melCount=MODEL_MEL_NUM) {
    // Copy to temp array - to the length corresponding to the input melspectrogram
    var tempArray = new Float32Array(MODEL_INPUT_SAMPLES);
    var startOffset = Math.floor(startMs/1000. * sampleRate);
    var numSamples = Math.min(Math.floor((endMs - startMs)/1000. * sampleRate), MODEL_INPUT_SAMPLES);
    tempArray.set(resampledMonoAudio.slice(startOffset, startOffset + numSamples));

    // return melspectrogram
    return magenta_utils.powerToDb(magenta_utils.melSpectrogram(tempArray, {
        sampleRate: sampleRate,
        hopLength: hopSize,
        nMels: melCount,
        nFft: fftSize,
        fMin: 0,
    }));
}
  
exports.loadResampleAndMakeMono = loadResampleAndMakeMono;
exports.getMelspectrogram = getMelspectrogram;
exports.getMelspectrogramForClassification = getMelspectrogramForClassification;