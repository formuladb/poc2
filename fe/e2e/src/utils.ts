const shell = require('shelljs');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const mp3Duration = require('mp3-duration');
import { browser, element, ExpectedConditions, by, ElementFinder } from 'protractor';
import { strictEqual } from 'assert';
import { stringify } from '@angular/core/src/render3/util';
var path = require('path');
var ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

const client = new textToSpeech.TextToSpeechClient();
var isWin = process.platform === "win32";
var base_videos_path = 'e2e/protractor_videos/';

export async function highlightElement(element: ElementFinder) :Promise<any> {
    const previous = await browser.driver.executeScript("arguments[0].getAttribute('style');", element.getWebElement());
    await browser.driver.executeScript("arguments[0].setAttribute('style', arguments[1]);",element.getWebElement(), "color: Red; border: 2px solid red;");
    return previous;
};

export async function removeHighlighting(element: ElementFinder, previousStyle: any) {
    await browser.driver.executeScript("arguments[0].setAttribute('style', arguments[1]);",element.getWebElement(), previousStyle);
}

export async function create_audio_tracks(messages: string[], durations: number[]) {

    shell.mkdir('-p', path.join(base_videos_path, 'tmp'));
    shell.rm('-rf', path.join(base_videos_path, 'tmp'));
    if (!fs.existsSync(path.join(base_videos_path, 'tmp'))) {
      fs.mkdirSync(path.join(base_videos_path, 'tmp'));
    }
  
    for (var i = 0; i < messages.length; i++) {
      const request = {
        id: i,
        input: {text: messages[i]},
        // Select the language and SSML Voice Gender (optional)
        voice: {languageCode: 'en-US', ssmlGender: 'NEUTRAL'},
        // Select the type of audio encoding
        audioConfig: {audioEncoding: 'MP3'},
      };
  
      let response = await client.synthesizeSpeech(request);
      // Write the binary audio content to a local file
      fs.writeFileSync(path.join(base_videos_path, 'tmp') + '/output_' + request.id + '.mp3', response[0].audioContent);
      console.log('Audio content written to file: ' + path.join(base_videos_path, 'tmp') + '/output_' + request.id + '.mp3');
  
      let duration = await mp3Duration(path.join(base_videos_path, 'tmp') + '/output_' + request.id + '.mp3');
  
      console.log('Your file is ' + duration + ' seconds long');
      durations[request.id] = duration * 1000;
    };
}

export async function handle_element_click(button: ElementFinder, duration: number) {
    let startTime = new Date().getTime();

    let previousStyle = await highlightElement(button);

    let endTime = new Date().getTime();

    await highlightElement(button);

    await browser.sleep(duration - (endTime-startTime) - 100);
    await removeHighlighting(button, previousStyle);

    button.click();

    console.log("time spent in action", (endTime-startTime));
}

export function get_input_audio_string(number_of_audios: number): string {
    let inputs = 'concat:';
    for (var _i = 0; _i < number_of_audios; _i++) {
        inputs += path.join(base_videos_path, 'tmp') + '/output_' + String(_i) + '.mp3|';
    }

    return inputs;
}

export function cleanup(test_name: string): void {
    shell.mv(path.join(base_videos_path, 'tmp/') + 'protractor-cropped.avi', base_videos_path+test_name+'.avi');
    shell.mv(path.join(base_videos_path, 'tmp/') + 'protractor-cropped.gif', base_videos_path+test_name+'.gif');
    shell.rm('-rf', path.join(base_videos_path, 'tmp'));
}

// This is mostly in order to use promises instead of callbacks
export function create_gif_palette_and_video() {
    return new Promise((resolve, reject) => {

        // GIF palette
        var gif_palette = new ffmpeg()
        .input(path.join(base_videos_path, 'tmp/') + 'protractor-final.avi')
        .filterGraph('palettegen')
        .on('error', function(err) {
            console.log('An error occurred during gif palette: ' + err.message);
            return reject(err);
        })
        .on('end', function() {
            console.log('GIF palette setup finished !');
            // GIF
            var gif_video = new ffmpeg()
            .input(path.join(base_videos_path, 'tmp/') + 'protractor-final.avi')
            .input(path.join(base_videos_path, 'tmp/') + 'palette.png')
            .on('error', function(err) {
                console.log('An error occurred during gif conversion: ' + err.message);
                return reject(err);
            })
            .on('end', function() {
                console.log('GIF conversion finished !');
                return resolve();
            })
            .output(path.join(base_videos_path, 'tmp/') + 'protractor-cropped.gif')
            .complexFilter([ "crop=1920:950:0:130,fps=5,scale=1920:-1:flags=lanczos[x];[x][1:v]paletteuse" ])
            .run();
        })
        .output(path.join(base_videos_path, 'tmp/') + 'palette.png')
        .run();
    })
}


export function wait_for_ffmpeg_stream_to_finish(stream: any) {

    stream.kill();

    return new Promise((resolve, reject) => {
        stream.on('error', function() {
            console.log('Ffmpeg has been killed');
            return resolve();
        })
    });

}

export function concat_audio(messages: any) {

    return new Promise((resolve, reject) => {
        var concat_audio = new ffmpeg()
        .input(get_input_audio_string(messages.length))
        .audioCodec('copy')
        .on('error', function(err) {
            console.log('An error occurred merging audio: ' + err.message);
            return reject(err);
        })
        .on('end', function() {
            console.log('Audio Merging finished !');
            return resolve();
        })
        .output(path.join(base_videos_path, 'tmp/') + 'protractor.mp3')
        .run();  
    });
}

export function merge_video_and_audio() {
    return new Promise((resolve, reject) => {
        var merge_video_and_audio = new ffmpeg()
        .input(path.join(base_videos_path, 'tmp/') + 'protractor.avi')
        .input(path.join(base_videos_path, 'tmp/') + 'protractor.mp3')
        .audioCodec('copy')
        .videoCodec('copy')
        .on('error', function(err) {
          console.log('An error occurred merging audio and video: ' + err.message);
          return reject(err);
        })
        .on('end', function() {
            console.log('Audio/Video Merging finished !');
            return resolve();
        })
        .output(path.join(base_videos_path, 'tmp/') + 'protractor-final.avi')
        .run();  
     })
}

export function crop_video() {
    return new Promise((resolve, reject) => {
        var cropped_video = new ffmpeg()
        .input(path.join(base_videos_path, 'tmp/') + 'protractor-final.avi')
        .audioCodec('copy')
        .on('error', function(err) {
            console.log('An error occurred cropping: ' + err.message);
            return reject(err);
        })
        .on('end', function() {
            console.log('Video cropping finished !');
            return resolve();
        })
        .fps(24)
        .videoBitrate('4096k')
        .output(path.join(base_videos_path, 'tmp/') + 'protractor-cropped.avi')
        .complexFilter([ "crop=1920:950:0:130" ])
        .run();
    })
}

export function create_stream_and_run() {
    var stream: any;

    if (isWin) {
        stream = new ffmpeg().input('desktop').inputOptions(['-f gdigrab' ]).fps(24).size('100%').videoBitrate('4096k').output(path.join(base_videos_path, 'tmp/') + 'protractor.avi');
    } else {
        stream = new ffmpeg()
            .input(process.env.DISPLAY)
            .inputOptions([ '-f x11grab', '-s 1920x1080' ])
            .fps(24)
            .videoBitrate('4096k')
            .output(path.join(base_videos_path, 'tmp/') + 'protractor.avi');
    }

    stream.run();

    return stream;
}
