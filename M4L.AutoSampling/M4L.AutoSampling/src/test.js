
const audio_utils = require('./audio_utils');

async function getMelSpectrogram(filepath){

    var buffer = await audio_utils.loadAudioFromFile(filepath);
    var v = await audio_utils.preprocessAudio(buffer);
    console.log(v);
}

getMelSpectrogram("./audio/kick.wav");

