/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 * 1. Settings, Enable developer mode
 * 1. Change color for the 1st theme
 * 2. Change image for the 1st theme
 * 3. Switch between themes
 */

import { browser, element, ExpectedConditions, by } from 'protractor';
var e2e_utils = require("./utils");

const path = require('path');
const mp3Duration = require('mp3-duration');
// export GOOGLE_APPLICATION_CREDENTIALS=soica-d09d94fbea9e.json
const textToSpeech = require('@google-cloud/text-to-speech');
const client = new textToSpeech.TextToSpeechClient();
const fs = require('fs');
var shell = require('shelljs');

let test_name = 'change-theme-and-color';

var messages = [ 'Go to setting menu on the top right corner of the screen',
                 'Click on Enable Developer Mode',
                 'Go back to the setting menu',
                 'Change the theme color from the color scheme',
                 'Go back to the setting menu',
                 'Change the theme background image from the predefined list of images',
                 'Go back to the setting menu',
                 'Change the theme to material',
                 'Go back to the setting menu',
                 'Change the theme to NowUI theme',
                 'Go back to the setting menu',
                 'Click on Disable Developer Mode' ];

var durations = new Array(messages.length);
var stream;

describe('Switch themes colors and images', () => {
  var until = ExpectedConditions;
  beforeAll(async () => {
    browser.ignoreSynchronization = true;
    browser.driver.manage().window().maximize();

    await e2e_utils.create_audio_tracks(messages, durations);
  });


  it('should display main page and go to settings', async () => {
    browser.driver.get('http://localhost:4200/');
    let button = element(by.css('a#TopNavSettings'));

    await browser.wait(until.presenceOf(button), 50000, 'Element taking too long to appear in the DOM');
    stream = e2e_utils.create_stream_and_run();
    await e2e_utils.handle_element_click(button, durations[0]);
  });

  it('Step 2', async () => {
    let button = element(by.css('div#navigation > ul:nth-of-type(2) > li > div > a:nth-of-type(3)'));
    await e2e_utils.handle_element_click(button, durations[1]);
  });

  it('Step 3', async () => {
    let button = element(by.css('a#TopNavSettings'));
    await e2e_utils.handle_element_click(button, durations[2]);
  });

  it('Step 4', async () => {
    let button = element(by.css('div#navigation > ul:nth-of-type(2) > li > div > a:nth-of-type(4) > i:nth-of-type(5)'));
    await e2e_utils.handle_element_click(button, durations[3]);
  });

  it('Step 5', async () => {
    let button = element(by.css('a#TopNavSettings'));
    await e2e_utils.handle_element_click(button, durations[4]);
  });

  it('Step 6', async () => {
    let button = element(by.css('div#navigation > ul:nth-of-type(2) > li > div > a:nth-of-type(5) > img:nth-of-type(2)'));
    await e2e_utils.handle_element_click(button, durations[5]);
  });

  it('Step 7', async () => {
    let button = element(by.css('a#TopNavSettings'));
    await e2e_utils.handle_element_click(button, durations[6]);
  });

  it('Step 8', async () => {
    let button = element(by.css('div#navigation > ul:nth-of-type(2) > li > div > a:nth-of-type(7)'));
    await e2e_utils.handle_element_click(button, durations[7]);
  });

  it('Step 9', async () => {
    let button = element(by.css('a#TopNavSettings'));
    await e2e_utils.handle_element_click(button, durations[8]);
  });

  it('Step 10', async () => {
    let button = element(by.css('div#navigation > ul > li:nth-of-type(2) > div > a:nth-of-type(6)'));
    await e2e_utils.handle_element_click(button, durations[9]);
  });

  it('Step 11', async () => {
    let button = element(by.css('a#TopNavSettings'));
    await e2e_utils.handle_element_click(button, durations[10]);
  });

  it('Step 12', async () => {
    let button = element(by.css('div#navigation > ul > li:nth-of-type(2) > div > a:nth-of-type(7)'));
    await e2e_utils.handle_element_click(button, durations[11]);

    await e2e_utils.wait_for_ffmpeg_stream_to_finish(stream);

    await e2e_utils.concat_audio(messages);

    await e2e_utils.merge_video_and_audio();

    await e2e_utils.crop_video();

    await e2e_utils.create_gif_palette_and_video();

    e2e_utils.cleanup(test_name);
  })

});
