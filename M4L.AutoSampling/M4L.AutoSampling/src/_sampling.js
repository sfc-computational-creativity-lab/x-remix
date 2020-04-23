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
var onset_threshold_ = 1.5;

// This will be printed directly to the Max console
Max.post(`Loaded the ${path.basename(__filename)} script`);

// Segmentation
Max.addHandler("segments", (filepath) => {
    audio_utils.loadResampleAndMakeMono(filepath, MODEL_SR).then(buffer => {
        // Store globally
        buffer_ = buffer; 

        // Get onsets
        var onsets = onset.getOnsets(buffer_, MODEL_SR, multiplier=onset_threshold_);   
        onsets_ = onsets; // store 

        Max.outlet("segments", onsets);
        Max.outlet("num_segments", onsets.length);
        Max.post("onsets:", onsets.length);
    }).catch(function (err) {
        Max.post(err);
    });
});

// Segmentation threshold
Max.addHandler("segments_thresh", (threshold) => {
    onset_threshold_ = threshold;
    Max.post(`segmentation threshold: ${onset_threshold_}`);
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
    console.assert(buffer_ != null && onsets_.length > 0);

    // classify segmennt
    let spec = getSpectrogramInTensor(buffer_, startMS, endMS);
    let spec_tensors = tf.stack([spec]);
    let predictions = tfmodel.predict(spec_tensors);
    predictions = predictions.flatten().dataSync(); // tf.tensor -> array


    // output    
    let preds = [];
    for (var i=0; i < predictions.length; i++) {
        preds[i] = predictions[i];  // how can I convert tensor data into normal array?
        Max.outlet("classify", i + 1, predictions[i]);
    }

    // find the class
    let classId = argMax(preds);
    Max.outlet("classified_class", DRUM_CLASSES[classId]);

    Max.outlet("end_process", 1);
});


// Utilities
function argMax(array) {
    return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
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
        var onsets = onset.getOnsets(buffer, MODEL_SR, multiplier=onset_threshold_);   
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

        // create 
        var spec_tensors = []
        for (var i = 0; i < onsets_num; i++){
            var start   = onsets[ i ];
            var end     = onsets[ i+1 ]
            let spec = getSpectrogramInTensor(buffer, start, end);
            spec_tensors.push(spec);
        }

        // Prediction!
        spec_tensors = tf.stack(spec_tensors);
        let predictions = tfmodel.predict(spec_tensors);
        predictions = predictions.dataSync(); // tf.tensor -> array

        // Assign
        var matrix = [];
        for (var i = 0; i < onsets_num; i++){
            // For Hangarian Assignment Algorithm, We need a cost matrix
            var costs = [];
            for (var j=0; j < DRUM_CLASSES.length; j++){
                costs.push(1.0 - predictions[i * DRUM_CLASSES.length + j]);
            }
            matrix.push(costs);
        }

        // // linear assignment problem
        var assignments = munkres(matrix);
        Max.post(assignments);
        return [onsets, assignments];
    })
    // output
    .then(([onsets, assignments]) => {
        // output
        for (var i = 0; i < assignments.length; i++){
            var assign      = assignments[i];
            var drumid      = assign[1];
            var segmentid   = assign[0];
            Max.outlet("sample", drumid + 1, onsets[segmentid], onsets[segmentid + 1], segmentid);
        }
        Max.outlet("end_process", 1);
    })
    // error handling
    .catch(function (err) {
        Max.post(err);
    });
}
exports.doesSample = doesSample;

// Crete drum set
Max.addHandler("sample", (filepath) => {
    Max.outlet("start_process", 1);
    doesSample(filepath);
});