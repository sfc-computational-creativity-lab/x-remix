const path = require('path');
const Max = require('max-api');

const onset = require('./onset.js');
const classify = require('./audio_classification.js');
var munkres = require('munkres-js');

var load = require('audio-loader');
var createBuffer = require('audio-buffer-from');
const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');

// Constants
const SEGMENT_MIN_LENGTH = 150; // Minimum length of an audio segment

// keras-based model to classify drum kit sound based on its spectrogram.
// python script: https://gist.github.com/naotokui/a2b331dd206b13a70800e862cfe7da3c
const modelpath = "file://./models/drum_classification_128_augmented/model.json";

// Load tensorflow.js model from the path
async function loadPretrainedModel() {
    tfmodel = await tf.loadModel(modelpath);
    isModelLoaded = true;
    console.log("model loaded");
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

// This will be printed directly to the Max console
Max.post(`Loaded the ${path.basename(__filename)} script`);

// Segmentation
Max.addHandler("segments", (filepath) => {
    var onsets = segmentation(filepath);
    console.log(onsets);
    Max.outlet("segments", onsets);
});

async function segmentation(filepath){
    // load file and process
    load(filepath).then(function (buffer) {
        var onsets = onset.getOnsets(buffer, SEGMENT_MIN_LENGTH);
        buffer_ = buffer;
        return onsets;
    }).catch(function (err) {
        Max.post(err);
    });
}

// Find a segment containing the given position
Max.addHandler("find_segment", (position) => {
    if (typeof onsets === "undefined") {
        Max.post("no segmentation data found");
        return;
    } else {
        for (let i = 0; i < onsets.length - 1; i++) {
            if (onsets[i] < position && position <= onsets[i + 1]) {
                Max.outlet("find_segment", onsets[i], onsets[i + 1]);
                break;
            }
        }
    }
});

// Classification
Max.addHandler("classify", (startMS, endMS) => {
    var resampled = createBuffer(buffer_, {rate:22100}) // resample for spectrogram

    let prediction = classifyAudioSegment(resampled, startMS, endMS);
    Max.outlet("classify", prediction);

    let classId = argMax(prediction);
    Max.outlet("classified_class", DRUM_CLASSES[classId]);
});

// Classification with TensorFlow
function classifyAudioSegment(buffer, startMS, endMS, fftSize = 1024, hopSize = 256, melCount = 128, specLength = 32) {
    if (typeof isModelLoaded === "undefined" || !isModelLoaded) {
        Max.post("Error: TF Model is not loaded.");
        return;
    }

    // Get spectrogram matrix
    let db_spectrogram = classify.createSpectrogram(buffer, startMS, endMS, fftSize, hopSize, melCount, false);

    // Create tf.tensor2d
    // This audio classification model expects spectrograms of [128, 32]  (# of melbanks: 128 / duration: 32 FFT windows) 
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
    input_tensor = tf.reshape(input_tensor, [1, input_tensor.shape[0], input_tensor.shape[1], 1]); // [1, 128, 32, 1]
    
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
        console.error(err);
    }
}

// Utilities
function argMax(array) {
    return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
}

// Crete drum set
Max.addHandler("create", (filepath) => {
    var onsets = segmentation(filepath);
    Max.outlet("segments", onsets);
    console.log(onsets);

    var resampled = createBuffer(buffer_, {rate:22100}) // resample for spectrogram
    var matrix = [];
    for (var i = 0; i < onsets.length - 1; i++){
        var start   = onsets[ i ];
        var end     = onsets[ i+1 ]

        var prediction = classifyAudioSegment(resampled, start, end);

        // For Hangarian Assignment Algorithm, We need a cost matrix
        var costs = [];
        for (var j=0; j < prediction.length; j++){
            costs.push(prediction[j] * -1.0)
        }
        matrix.push(costs);
    }

    Max.post("onsets", onsets);
    Max.post("matrix", matrix);
    
    // Assignments
    var assignments = munkres(matrix);
    Max.post(assignments);
    // Max.outlet("classify", prediction);
});