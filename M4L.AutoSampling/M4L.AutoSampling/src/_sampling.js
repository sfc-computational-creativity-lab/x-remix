const path = require('path');
const Max = require('max-api');

const onset = require('./onset.js');
const audio_utils = require('./audio_utils.js');
const classify = require('./audio_classification.js');
var munkres = require('munkres-js'); //https://github.com/addaleax/munkres-js

const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');

// Constants
const MODEL_SR = require('./constants.js').MODEL_SR;
const MODEL_HOP_SIZE = require('./constants.js').MODEL_HOP_SIZE;
const MODEL_FFT_SIZE = require('./constants.js').MODEL_FFT_SIZE;
const MODEL_MEL_LENGTH = require('./constants.js').MODEL_MEL_LENGTH;
const MODEL_MEL_NUM = require('./constants.js').MODEL_MEL_NUM;
const SEGMENT_MAX_NUM = require('./constants.js').SEGMENT_MAX_NUM;

// keras-based model to classify drum kit sound based on its spectrogram.
// python script: https://gist.github.com/naotokui/a2b331dd206b13a70800e862cfe7da3c
// const modelpath = "file://./models/drum_classification_128_augmented/model.json"; // snare + kickみたいな音も使ってた
const modelpath = "file://./models/drum_spec_model_128_aug_level/model.json";

// Load tensorflow.js model from the path
async function loadPretrainedModel() {
    tfmodel = await tf.loadModel(modelpath);
    isModelLoaded = true;
    console.log("model loaded");
    tfmodel.summary();
}
loadPretrainedModel();

// Drum kit 
const DRUM_CLASSES = [
    'Kick',
    'Snare',
    'Hi-hat closed',
    'Hi-hat open',
    'Tom low',
    'Tom mid',
    'Tom high',
    'Clap',
    'Rim'
];

// Global Variables
var buffer_;
var onsets_;

// This will be printed directly to the Max console
Max.post(`Loaded the ${path.basename(__filename)} script`);

// Segmentation
Max.addHandler("segments", (filepath) => {
    audio_utils.loadResampleAndMakeMono(filepath, MODEL_SR).then(buffer => {
        // Store globally
        buffer_ = buffer; 

        // Get onsets
        var onsets = onset.getOnsets(buffer_, MODEL_SR);   
        onsets_ = onsets; // store 
        Max.outlet("segments", onsets);
        Max.outlet("num_segments", onsets.length);
    }).catch(function (err) {
        Max.post(err);
    });
});

// Find a segment containing the given position
Max.addHandler("find_segment", (position) => {
    if (typeof onsets_ === "undefined") {
        Max.post("no segmentation data found");
        return;
    } else {
        for (let i = 0; i < onsets_.length - 1; i++) {
            if (onsets_[i] < position && position <= onsets_[i + 1]) {
                Max.outlet("find_segment", onsets_[i], onsets_[i + 1]);
                break;
            }
        }
    }
});

// Classification
Max.addHandler("classify", (startMS, endMS) => {
    // classify segmennt
    let prediction = classifyAudioSegment(buffer_, startMS, endMS);
    Max.outlet("classify", prediction);

    let classId = argMax(prediction);
    Max.outlet("classified_class", DRUM_CLASSES[classId]);
});

// Classification with TensorFlow
function classifyAudioSegment(buffer, startMS, endMS, sampleRate = MODEL_SR, fftSize = MODEL_FFT_SIZE, 
                    hopSize = MODEL_HOP_SIZE, melCount = MODEL_MEL_NUM, specLength = MODEL_MEL_LENGTH) {
    if (typeof isModelLoaded === "undefined" || !isModelLoaded) {
        Max.post("Error: TF Model is not loaded.");
        return;
    }

    // for (var i=0; i <buffer.length; i++) buffer[i] = 0.0;
    let db_spectrogram = audio_utils.getMelspectrogramForClassification(buffer, startMS, endMS, sampleRate,
                                                         fftSize, hopSize, melCount);

    // Get spectrogram matrix
    // db_spectrogram = classify.createSpectrogram(buffer, startMS, endMS, fftSize, hopSize, melCount, false);

    // Max.post(db_spectrogram.length);
    // for (var i=0; i <1; i++) {
    //     for (var j=0; j<128; j++){
    //         Max.post(i, j, db_spectrogram[i][j]);
    //     }
    // }

    // Create tf.tensor2d
    // This audio classification model expects spectrograms of [128, 128]  (# of melbanks: 128 / duration: 128 FFT windows) 
    const tfbuffer = tf.buffer([melCount, specLength]);

    // Initialize the tfbuffer.  TODO: better initialization??
    for (var i = 0; i < melCount; i++) {
        for (var j = 0; j < specLength; j++) {
            tfbuffer.set(classify.MIN_DB, i, j);
        }
    }

    // Fill the tfbuffer with spectrogram data in dB
    let lng = (db_spectrogram.length < specLength) ? db_spectrogram.length : specLength; // just in case the buffer is shorter than the specified size
    for (var i = 0; i < melCount; i++) {
        for (var j = 0; j < lng; j++) {
            tfbuffer.set(db_spectrogram[j][i], i, j); // cantion: needs to transpose the matrix
        }
    }

    // Reshape for prediction
    input_tensor = tfbuffer.toTensor(); // tf.buffer -> tf.tensor
    input_tensor = tf.reshape(input_tensor, [1, input_tensor.shape[0], input_tensor.shape[1], 1]); // [1, 128, 128, 1]

    // Prediction!
    try {
        let predictions = tfmodel.predict(input_tensor);
        predictions = predictions.flatten().dataSync(); // tf.tensor -> array
        let predictions_ = [] // we only care the selected set of drums
        for (var i = 0; i < DRUM_CLASSES.length; i++) {
            predictions_.push(predictions[i]);
        }
        return predictions_;
    } catch (err) {
        Max.post(err);
        console.error(err);
    }
}

// Utilities
function argMax(array) {
    return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
}

// Crete drum set
Max.addHandler("sample", (filepath) => {
    audio_utils.loadResampleAndMakeMono(filepath, MODEL_SR).then(buffer => {
        // Store globally
        buffer_ = buffer; 

        // Get onsets
        var onsets = onset.getOnsets(buffer, MODEL_SR);   
        onsets_ = onsets; // store 
        Max.outlet("segments", onsets);
        Max.outlet("num_segments", onsets.length);
        return [onsets, buffer];
    }).then(([onsets, buffer]) => {

        // Limit number of segments
        if (onsets.length > SEGMENT_MAX_NUM) {
            Max.post(`Too many segments. The object analyzes the first ${SEGMENT_MAX_NUM} segments`);
        }
        const onsets_num = Math.min(onsets.length-1, SEGMENT_MAX_NUM);

        // classify each segment
        var matrix = [];
        for (var i = 0; i < onsets_num; i++){
            var start   = onsets[ i ];
            var end     = onsets[ i+1 ]
            var prediction = classifyAudioSegment(buffer, start, end);
            // For Hangarian Assignment Algorithm, We need a cost matrix
            var costs = [];
            for (var j=0; j < prediction.length; j++){
                costs.push(1.0 - prediction[j])
            }
            matrix.push(costs);
        }

        // simple assignment
        var assignments = [];
        for (var j = 0; j < DRUM_CLASSES.length; j++){
            var costs = [];
            for (var i = 0; i < onsets_num; i++){
                costs.push(1.0 - matrix[i][j]);
            }
            var segmentid = costs.indexOf(Math.max(...costs));
            assignments.push([segmentid, j]);
        }

        Max.post(assignments);
        // Max.post(matrix);

        // linear assignment problem
        var assignments = munkres(matrix);
        Max.post(assignments);

        return [onsets, assignments];
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
            Max.outlet("sample", drumid + 1, onsets[segmentid], onsets[segmentid + 1], segmentid);
        }
    })
    // error handling
    .catch(function (err) {
        Max.post(err);
    });

    // Assignments
    // var assignments = munkres(matrix);
    // Max.post(assignments);
    // Max.outlet("classify", prediction);
});