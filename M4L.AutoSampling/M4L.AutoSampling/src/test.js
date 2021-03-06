// const sampling = require('./_sampling.js');

// sampling.doesSample("./audio/akaikick.wav");

const onset = require('./onset.js');
const audio_utils = require('./audio_utils.js');
// const classify = require('./audio_classification.js');
var munkres = require('munkres-js'); //https://github.com/addaleax/munkres-js

var load = require('audio-loader');
var createBuffer = require('audio-buffer-from');
const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');

// Constants
const MODEL_SR = require('./constants.js').MODEL_SR;
const MODEL_HOP_SIZE = require('./constants.js').MODEL_HOP_SIZE;
const MODEL_FFT_SIZE = require('./constants.js').MODEL_FFT_SIZE;
const MODEL_MEL_LENGTH = require('./constants.js').MODEL_MEL_LENGTH;
const MODEL_MEL_NUM = require('./constants.js').MODEL_MEL_NUM;
const SEGMENT_MAX_NUM = require('./constants.js').SEGMENT_MAX_NUM;

const modelpath = "file://./models/drum_spec_model_128_aug_level/model.json";
var tfmodel;

// Load tensorflow.js model from the path
async function loadPretrainedModel() {
    model = tf.loadModel(modelpath);
    isModelLoaded = true;
    // console.log("model loaded");
    // model.summary();
    return model;
}

// Get spectrogram in tf.tensor
function getSpectrogramInTensor(buffer, startMS, endMS, sampleRate = MODEL_SR, fftSize = MODEL_FFT_SIZE, 
    hopSize = MODEL_HOP_SIZE, melCount = MODEL_MEL_NUM, specLength = MODEL_MEL_LENGTH){

    let dbspec = audio_utils.getMelspectrogramForClassification(buffer, startMS, endMS, sampleRate,
        fftSize, hopSize, melCount);
    console.assert(dbspec.length >= specLength, "invalid spec size");

    // Fill the tfbuffer with spectrogram data in dB
    const tfbuffer = tf.buffer([melCount, specLength]);
    for (var i = 0; i < melCount; i++) {
        for (var j = 0; j < specLength; j++) {
            tfbuffer.set(dbspec[j][i], i, j); // cantion: needs to transpose the matrix
        }
    }
    
    // Buffer to Tensor
    tensor_spec = tfbuffer.toTensor(); // tf.buffer -> tf.tensor
    tensor_spec = tf.reshape(tensor_spec, [tensor_spec.shape[0], tensor_spec.shape[1], 1]); // [1, 128, 128, 1]
    return tensor_spec;
}


async function doesSample(filepath){
    audio_utils.loadResampleAndMakeMono(filepath, MODEL_SR).then(buffer => {
        // Store globally
        buffer_ = buffer; 

        // Get onsets
        var onsets = onset.getOnsets(buffer, MODEL_SR);   
        onsets_ = onsets; // store 

        return [onsets, buffer];
    }).then(([onsets, buffer]) => {

        // Limit number of segments
        const onsets_num = Math.min(onsets.length-1, SEGMENT_MAX_NUM);

        // create 
        var spec_tensors = []
        for (var i = 0; i < onsets_num; i++){
            var start   = onsets[ i ];
            var end     = onsets[ i+1 ]
            let spec = getSpectrogramInTensor(buffer, start, end);
            spec_tensors.push(spec);
            console.log(spec);
        }

        spec_tensors = tf.stack(spec_tensors);
        console.log(spec_tensors);

        // Prediction!
        try {
            let predictions = tfmodel.predict(spec_tensors);
            predictions = predictions.dataSync(); // tf.tensor -> array
        } catch (err) {
            console.log(err);
        }

        // Assign
        var matrix = [];
        for (var i = 0; i < predictions.length; i++){
            // For Hangarian Assignment Algorithm, We need a cost matrix
            var costs = [];
            for (var j=0; j < predictions[0].length; j++){
                costs.push(1.0 - predictions[i][j])
            }
            matrix.push(costs);
        }
        Max.post(matrix);
        
        // // Prediction!
        // try {
        //     spec_tensors = tf.stack(spec_tensors);
        //     let predictions = tfmodel.predict(spec_tensors);
        //     predictions = predictions.flatten().dataSync(); // tf.tensor -> array
        //     console.log(predictions);
        // } catch (err) {
        //     Max.post(err);
        //     console.error(err);
        // }

        // // classify each segment
        // var matrix = [];
        // for (var i = 0; i < onsets_num; i++){
        //     var start   = onsets[ i ];
        //     var end     = onsets[ i+1 ]
        //     let db_spectrogram = audio_utils.getMelspectrogramForClassification(buffer, start, end);


        //     var prediction = classifyAudioSegment(buffer, start, end);
        //     // For Hangarian Assignment Algorithm, We need a cost matrix
        //     var costs = [];
        //     for (var j=0; j < prediction.length; j++){
        //         costs.push(1.0 - prediction[j])
        //     }
        //     matrix.push(costs);
        // }

        // // simple assignment
        // var assignments = [];
        // for (var j = 0; j < DRUM_CLASSES.length; j++){
        //     var costs = [];
        //     for (var i = 0; i < onsets_num; i++){
        //         costs.push(1.0 - matrix[i][j]);
        //     }
        //     var segmentid = costs.indexOf(Math.max(...costs));
        //     assignments.push([segmentid, j]);
        // }

        // Max.post(assignments);
        // // Max.post(matrix);

        // // linear assignment problem
        // var assignments = munkres(matrix);
        // Max.post(assignments);

        // return [onsets, assignments];
    })
    // output
    .then(([onsets, assignments]) => {
        // sort
        // assignments.sort(function(a, b) {
        //     return a[1] - b[1];
        // });

        // output
        for (var i = 0; i < assignments.length; i++){
            var assign      = assignments[i];
            var drumid      = assign[1];
            var segmentid   = assign[0];
            // Max.outlet("sample", drumid + 1, onsets[segmentid], onsets[segmentid + 1], segmentid);
        }
    })
    // error handling
    .catch(function (err) {
        console.log(err);
    });
}


loadPretrainedModel().then((model)=>{
    tfmodel = model;
    doesSample("../audio/orf.wav");
});


// const onset = require('./onset.js');
// const audio_utils = require('./audio_utils.js');
// // const classify = require('./audio_classification.js');
// var munkres = require('munkres-js'); //https://github.com/addaleax/munkres-js

// var load = require('audio-loader');
// var createBuffer = require('audio-buffer-from');
// const tf = require('@tensorflow/tfjs');
// require('@tensorflow/tfjs-node');

// // Constants
// const MODEL_SR = require('./constants.js').MODEL_SR;
// const MODEL_HOP_SIZE = require('./constants.js').MODEL_HOP_SIZE;
// const MODEL_FFT_SIZE = require('./constants.js').MODEL_FFT_SIZE;
// const MODEL_MEL_LENGTH = require('./constants.js').MODEL_MEL_LENGTH;
// const MODEL_MEL_NUM = require('./constants.js').MODEL_MEL_NUM;

// // keras-based model to classify drum kit sound based on its spectrogram.
// // python script: https://gist.github.com/naotokui/a2b331dd206b13a70800e862cfe7da3c
// // const modelpath = "file://./models/drum_classification_128_augmented/model.json"; // snare + kickみたいな音も使ってた
// const modelpath = "file://./models/drum_spec_model_128_aug_level/model.json";

// var tfmodel;

// // Load tensorflow.js model from the path
// async function loadPretrainedModel() {
//     model = tf.loadModel(modelpath);
//     isModelLoaded = true;
//     // console.log("model loaded");
//     // model.summary();
//     return model;
// }

// console.log(10 /3);

// // // Classification with TensorFlow
// function classifyAudioSegment(buffer, startMS, endMS, sampleRate = MODEL_SR, fftSize = MODEL_FFT_SIZE, 
//             hopSize = MODEL_HOP_SIZE, melCount = MODEL_MEL_NUM, specLength = MODEL_MEL_LENGTH) {
//     // if (typeof isModelLoaded === "undefined" || !isModelLoaded) {
//     // console.log("Error: TF Model is not loaded.");
//     // return;
//     // }

//     // for (var i=0; i <buffer.length; i++) buffer[i] = 0.0;
//     let db_spectrogram = audio_utils.getMelspectrogramForClassification(buffer, startMS, endMS, sampleRate,
//                                             fftSize, hopSize, melCount);

//     console.log("magenta--", db_spectrogram.length, db_spectrogram[0].length);

//     // // Get spectrogram matrix
//     // // db_spectrogram = classify.createSpectrogram(buffer, startMS, endMS, fftSize, hopSize, melCount, false);

//     // // console.log(db_spectrogram.length);
//     // // for (var i=0; i <db_spectrogram.length; i++) {
//     // //     for (var j=0; j<128; j++){
        
//     // //         console.log(i, j, db_spectrogram[i][j]);
//     // //     }
//     // // }

//     // // Create tf.tensor2d
//     // // This audio classification model expects spectrograms of [128, 128]  (# of melbanks: 128 / duration: 128 FFT windows) 
//     // const tfbuffer = tf.buffer([melCount, specLength]);

//     // // Initialize the tfbuffer.  TODO: better initialization??
//     // for (var i = 0; i < melCount; i++) {
//     // for (var j = 0; j < specLength; j++) {
//     // tfbuffer.set(-80, i, j);
//     // }
//     // }

//     // // Fill the tfbuffer with spectrogram data in dB
//     // let lng = (db_spectrogram.length < specLength) ? db_spectrogram.length : specLength; // just in case the buffer is shorter than the specified size
//     // for (var i = 0; i < melCount; i++) {
//     // for (var j = 0; j < lng; j++) {
//     // tfbuffer.set(db_spectrogram[j][i], i, j); // cantion: needs to transpose the matrix
//     // }
//     // }

//     // // Reshape for prediction
//     // input_tensor = tfbuffer.toTensor(); // tf.buffer -> tf.tensor
//     // input_tensor = tf.reshape(input_tensor, [1, input_tensor.shape[0], input_tensor.shape[1], 1]); // [1, 128, 128, 1]

//     // // Prediction!
//     // try {
//     // let predictions = tfmodel.predict(input_tensor);
//     // predictions = predictions.flatten().dataSync(); // tf.tensor -> array
//     // let predictions_ = [] // we only care the selected set of drums
//     // for (var i = 0; i < DRUM_CLASSES.length; i++) {
//     // predictions_.push(predictions[i]);
//     // }
//     // return predictions_;
//     // } catch (err) {
//     // console.log(err);
//     // console.error(err);
//     // }
// }

// // loadPretrainedModel().then((model) => {

// //     tfmodel = model;

// //     tfmodel.summary();



// audio_utils.loadResampleAndMakeMono("./audio/akaikick.wav", MODEL_SR).then(buffer => {
//     // Store globally
//     // buffer_ = buffer; 

//     console.log(buffer.length);

//     // // Get onsets
    
//     var onsets = onset.getOnsets(buffer, MODEL_SR);   
//     // onsets_ = onsets; // store 
//     console.log("segments", onsets);

//     // console.log(onsets);

//     // console.log(onsets_);
   
//     // classify each segment
//     var melspec = audio_utils.getMelspectrogramForClassification(buffer, 0, buffer.length/MODEL_SR * 1000.);
//     console.log(melspec.length, melspec[0].length);
    
    
//     var i, j, sub, total, count, avg;

//     total = count = 0;
//     var maxval = -100;
//     for (i = 0; i < 128; ++i) {
//         sub = melspec[i];
//         count += sub.length;
//         for (j = 0; j < sub.length; ++j) {
//             total += sub[j];
//             if (sub[j] > maxval) maxval = sub[j];
//         }
//     }
//     avg = count === 0 ? NaN : total / count;
//     console.log(avg, maxval)



//     //     // // For Hangarian Assignment Algorithm, We need a cost matrix
//     //     // var costs = [];
//     //     // for (var j=0; j < prediction.length; j++){
//     //     //     costs.push(1.0 - prediction[j])
//     //     // }
//     //     // matrix.push(costs);
//     // }
    

// }).catch(function (err) {
//     console.log(err);
// });
// // });

// // loadResampleAndMakeMono("./audio/kick.wav", 16000);

// // function getMonoAudio(audioBuffer) {
// //     if (audioBuffer.numberOfChannels === 1) {
// //       return audioBuffer.getChannelData(0);
// //     }
// //     if (audioBuffer.numberOfChannels !== 2) {
// //       throw Error(
// //           `${audioBuffer.numberOfChannels} channel audio is not supported.`);
// //     }
// //     const ch0 = audioBuffer.getChannelData(0);
// //     const ch1 = audioBuffer.getChannelData(1);
  
// //     const mono = new Float32Array(audioBuffer.length);
// //     for (let i = 0; i < audioBuffer.length; ++i) {
// //       mono[i] = (ch0[i] + ch1[i]) / 2;
// //     }
// //     return mono;
// // }


// // async function loadResampleAndMakeMono(filepath, targetSR){
// //     var buffer = await magenta_utils.loadAudioFromFile(filepath); // AudioBuffer
// //     var resampledBuffer = createBuffer(buffer,  {rate: targetSR}); // resampled AudioBuffer
// //     var monoBuffer = getMonoAudio(resampledBuffer);  // FloatArry
// //     return monoBuffer;
// // }

// // function getMelspectrogram(resampledMonoAudio, sampleRate, fftSize, hopSize, melCount) {
// //     return magenta_utils.powerToDb(magenta_utils.melSpectrogram(resampledMonoAudio, {
// //       sampleRate: sampleRate,
// //       hopLength: hopSize,
// //       nMels: melCount,
// //       nFft: fftSize,
// //       fMin: 0,
// //     }));
// //   }

// //   function getMelspectrogramForClassification(resampledMonoAudio, startMs, endMs, sampleRate, fftSize, hopSize, melCount) {

// //     // Copy to temp array
// //     var tempArray = new Float32Array(MODEL_INPUT_SAMPLES);
// //     var startOffset = Math.floor(startMs/1000. * sampleRate);
// //     var numSamples = Math.min(Math.floor((endMs - startMs)/1000. * sampleRate), MODEL_INPUT_SAMPLES);
// //     tempArray.set(resampledMonoAudio.slice(startOffset, numSamples));

// //     return magenta_utils.powerToDb(magenta_utils.melSpectrogram(tempArray, {
// //       sampleRate: sampleRate,
// //       hopLength: hopSize,
// //       nMels: melCount,
// //       nFft: fftSize,
// //       fMin: 0,
// //     }));
// //   }
  
// // var samples = loadResampleAndMakeMono("./audio/kick.wav", 16000);
// // samples.then(buffer => { 
// //     console.log(buffer);
// //     var melspec =  getMelspectrogramForClassification(buffer, 0.0, 1.0, 16000, 1024, 256, 128)
// //     console.log(melspec.length, melspec[0].length);
// // });



// // getMelSpectrogram("./audio/kick.wav");

