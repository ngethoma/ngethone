let baseFreq = 440.0; 
let oscs = {};
let activeKeys = {};
let keyMap;
let displayPreviousFreq = 440.0;
let displayCurrentFreq = 440.0;
let started = false;

let reverbOn = true;   
let delayOn = true;    
let visualizerOn = true;
let fadeOn = true;     
let waveformOn = true; 

let reverb;
let delay;
let fft;

let customWaves = [
  { shape: 'sine',     amp: 0.25 }, 
  { shape: 'triangle', amp: 0.25 },
  { shape: 'square',   amp: 0.25 },
  { shape: 'sawtooth', amp: 0.25 }
];

let reverbMix = 0.5;
let delayMix = 0.5;


function symbolToShape(symbol) {
  switch (symbol) {
    case '正': return 'sine';
    case '三': return 'triangle';
    case '矩': return 'square';
    case '鋸': return 'sawtooth';
    default:   return 'sine';
  }
}

let waveSelects = [];
let waveAmps = [];
let waveAmpLabels = [];

let waveforms = ['sine'];
let currentPreset = 0;
let presetNames = ['Sine', 'Triangle', 'Square', 'Sawtooth', 'Piano', 'Custom'];


let customPanel;         
let customPanelVisible = false;  

let volumeSlider;

let arrowX, arrowY, arrowW, arrowH;

let baseFreqInput;
let baseFreqLabel;

let pianoSamples = {};
let notesToLoad = [];

let currentPressedKey = null;


for (let octave = 1; octave <= 7; octave++) {
  ['C','D', 'E', 'G', 'A'].forEach(note => {
    notesToLoad.push(note + octave);
  });
}


function preload() {
  for (let name of notesToLoad) {
    pianoSamples[name] = loadSound(`https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/${name}.mp3`);
  }
}


function setup() {
  let wrapper = createDiv();
  wrapper.id('wrapper');

  let canvas = createCanvas(800, 500);
  canvas.parent(wrapper);

  reverb = new p5.Reverb();
  delay = new p5.Delay();
  fft = new p5.FFT();

  for (let i = 0; i < presetNames.length; i++) {
    let btn = createButton(presetNames[i]);
    btn.parent(wrapper); 
    btn.position(20, 20 + i * 30);
    btn.mousePressed(() => changePreset(i));

    if (i === 5) {
      let toggleCustomBtn = createButton('Custom Settings');
      toggleCustomBtn.parent(wrapper); 
      toggleCustomBtn.position(20, 20 + i * 30 + 30);
      toggleCustomBtn.mousePressed(() => {
        customPanelVisible = !customPanelVisible;
        customPanel.style('display', customPanelVisible ? 'block' : 'none');
      });
    }
  }

  customPanel = createDiv(); 
  customPanel.parent(wrapper); 
  customPanel.position(20, 220);
  customPanel.style('padding', '5px');
  customPanel.style('border', '1px solid #999');
  customPanel.style('display', 'none');  

  let label = createDiv('＜Custom Settings＞');
  label.parent(customPanel);

  let waveSymbols = ['正', '三', '矩', '鋸']; 
  for (let i = 0; i < 8; i++) {
    let rowDiv = createDiv().parent(customPanel);
    rowDiv.style('margin-bottom', '4px');

    let partialNum = (i + 1) + "次倍音"; 
    createSpan(partialNum + " : ").parent(rowDiv);

    let sel = createSelect().parent(rowDiv);
    for (let sym of waveSymbols) {
      sel.option(sym);
    }
    let defaultSymbol = (i === 0) ? '正' :
                        (i === 1) ? '三' :
                        (i === 2) ? '矩' : '鋸';
    sel.selected(defaultSymbol);
    sel.changed(updateCustomWaves);
    waveSelects.push(sel);

    let slider = createSlider(0, 1, 0.25, 0.01).parent(rowDiv);
    slider.input(() => {
      waveAmpLabels[i].html(slider.value().toFixed(2));
      updateCustomWaves();
    });
    waveAmps.push(slider);

    let valSpan = createSpan(slider.value().toFixed(2)).parent(rowDiv);
    valSpan.style('margin-left', '8px');
    waveAmpLabels.push(valSpan);
  }

  volumeSlider = createSlider(0, 1, 0.5, 0.01);
  volumeSlider.parent(wrapper);  
  volumeSlider.position(width - 150, height - 40); 

  volLabel = createSpan('Vol');
  volLabel.parent(wrapper); 
  volLabel.position(width - 180, height - 43);
  volLabel.style('color', 'rgb(0, 102, 204)');
  

  let reverbLabel = createSpan("Rvb");
  reverbLabel.parent(wrapper);
  reverbLabel.position(width - 160, height - 460);
  reverbLabel.style('color', 'rgb(0, 102, 204)');

  let reverbSlider = createSlider(0, 1, reverbMix, 0.01);
  reverbSlider.parent(wrapper);
  reverbSlider.position(width - 125, height - 457);
  reverbSlider.size(110);
  reverbSlider.input(() => {
    reverbMix = reverbSlider.value();
    reverbOn = reverbMix > 0;
  });


  let delayLabel = createSpan("Dly");
  delayLabel.parent(wrapper);
  delayLabel.position(width - 160, height - 435);
  delayLabel.style('color', 'rgb(0, 102, 204)');

  let delaySlider = createSlider(0, 0.8, delayMix, 0.01);
  delaySlider.parent(wrapper);
  delaySlider.position(width - 125, height - 432);
  delaySlider.size(110);
  delaySlider.input(() => {
    delayMix = delaySlider.value();
    delayOn = delayMix > 0;
  });



  const defaultKeyMap = {
    '1': [1, 1], '2': [2, 1], '3': [3, 2], '4': [4, 3], '5': [5, 4],
    '6': [5, 3], '7': [6, 5], '8': [7, 6], '9': [7, 5], '0': [7, 4],
    '-': [8, 7], '^': [8, 5], '\\': [9, 8], 'q': [9, 7], 'w': [9, 5],
    'e': [10, 9], 'r': [10, 7], 't': [11, 10], 'y': [11, 9], 'u': [11, 8],
    'i': [11, 7], 'o': [11, 6], 'p': [12, 11], '@': [12, 7], '[': [1, 2],
    'a': [2, 3], 's': [3, 4], 'd': [3, 5], 'f': [4, 5], 'g': [4, 7],
    'h': [5, 6], 'j': [5, 7], 'k': [5, 8], 'l': [5, 9], ';': [6, 7],
    ':': [7, 8], ']': [7, 9], 'z': [7, 10], 'x': [7, 11], 'c': [7, 12],
    'v': [7, 13], 'b': [8, 9], 'n': [8, 11], 'm': [8, 13], ',': [9, 10],
    '.': [9, 11], '/': [9, 13]
  };
  keyMap = Object.assign({}, defaultKeyMap);

  arrowW = 16;  
  arrowH = 16;  
  arrowX = 10;  
  arrowY = height - arrowH - 10; 

  baseFreqLabel = createSpan("BaseFreq: ");
  baseFreqLabel.parent(wrapper); 
  baseFreqLabel.position(width - 160, height - 489);  
  baseFreqLabel.style('color', 'rgb(0, 102, 204)');

  baseFreqInput = createInput("440");  
  baseFreqInput.parent(wrapper); 
  baseFreqInput.position(width - 80, height - 486); 
  baseFreqInput.size(60);

  baseFreqInput.input(() => {
    let val = parseFloat(baseFreqInput.value());
    if (!isNaN(val)) {
      baseFreq = val;
      displayPreviousFreq = baseFreq;
      displayCurrentFreq = baseFreq;
    }
  });
  
  let keyMapPanelVisible = false;

let toggleKeyMapBtn = createButton('KeyMap');
toggleKeyMapBtn.parent(wrapper);
toggleKeyMapBtn.position(720, 400);
toggleKeyMapBtn.mousePressed(() => {
  keyMapPanelVisible = !keyMapPanelVisible;
  keyMapPanel.style('display', keyMapPanelVisible ? 'block' : 'none');
});


  let keyMapPanel = createDiv(); 
keyMapPanel.parent(wrapper); 
keyMapPanel.position(500, 360); 
keyMapPanel.style('padding', '5px');
keyMapPanel.style('border', '1px solid #999');
keyMapPanel.style('background', '#eef');
keyMapPanel.style('display', 'none'); 


  createSpan("Key: ").parent(keyMapPanel);
  let keyInput = createInput().parent(keyMapPanel);
  keyInput.size(30);

  createSpan(" Ratio: ").parent(keyMapPanel);
  let numInput = createInput().parent(keyMapPanel);
  numInput.size(30);

  createSpan(" : ").style('margin-right', '0px').parent(keyMapPanel);
  let denInput = createInput().parent(keyMapPanel);
  denInput.size(30);


  
  let updateBtn = createButton("Update").parent(keyMapPanel);
  updateBtn.style('margin-left', '5px');
  updateBtn.mousePressed(() => {
    let key = keyInput.value();
    let num = parseInt(numInput.value());
    let den = parseInt(denInput.value());
    if (key && !isNaN(num) && !isNaN(den)) {
      keyMap[key] = [num, den];
    }
  });
  
  setupSequencePanel(wrapper);
  
}





function draw() {
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(color(240, 248, 255), color(255, 255, 255), inter);
    stroke(c);
    line(0, y, width, y);
  }
  noStroke();

  p5.soundOut.output.gain.value = volumeSlider.value();

  if (!started) {
    stroke(255);
    strokeWeight(2);
    fill(0, 102, 204);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Press Space to Start", width/2, height/2 -12);
  }

  drawWaveMode();

  if (visualizerOn) {
    drawVisualizer();
  }
  if (waveformOn) {
    drawWaveform();
  }
  drawKeyboard();

  fill(0, 102, 204);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  text("◀", arrowX, arrowY);
  
  if (!sequencePaused && (sequenceActive || isRecording)) {
  sequenceCurrentTime = millis() - sequenceStartTime;
}
sequenceTimeInput.value((sequenceCurrentTime / 1000).toFixed(2));

  updateSequence();
}

function mousePressed() {
  if (
    mouseX +5 >= arrowX && mouseX <= arrowX + arrowW +5 &&
    mouseY +5 >= arrowY && mouseY <= arrowY + arrowH +5
  ) {
    window.open('http://ngethoma.com/notion', '_blank');
  }
}

function drawWaveMode() {
  fill(0, 102, 204);
  textSize(16);
  textAlign(CENTER, TOP);
  let modeName = presetNames[currentPreset];
  text(`Now wave: ${modeName}`, width / 2 , 20);
}

function keyPressed() {
  if (!started && key === ' ') {
    started = true;
    playOscillator(' ', baseFreq);
    return;
  }

  if (!started) return;

  let ratio = keyMap[key];
  if (ratio && !oscs[key]) {
    let newFreq = displayCurrentFreq * (ratio[0] / ratio[1]);
    playOscillator(key, newFreq);
    activeKeys[key] = true;

    if (isRecording) {
      recordedEvents.push({
        time: sequenceCurrentTime,
        ratio: ratio,
        length: 300  
      });
    }
  }
}


function keyReleased(e) {
  let releasedKey = e.key;
  if (oscs[releasedKey]) {
    stopOscillator(releasedKey);
  }

  if (isRecording && recordedEvents.length > 0) {
    let last = recordedEvents[recordedEvents.length - 1];
    if (typeof last.time === 'number' && last.length === 300) {
      last.length = sequenceCurrentTime - last.time;
    }
  }
}




function playOscillator(key, freq) {
    updateFreqDisplay(freq);
  if (currentPreset === 5) {
    let waveOscs = [];
    for (let i = 0; i < customWaves.length; i++) {
      let cw = customWaves[i];
      let partialIndex = i + 1;
      let partialFreq = freq * partialIndex;

      let osc = new p5.Oscillator(cw.shape);
      osc.freq(partialFreq);
      osc.start();

      if (fadeOn) {
        osc.amp(0, 0.05);
        osc.amp(cw.amp, 0.5);
      } else {
        osc.amp(cw.amp);
      }

      if (reverbOn) reverb.process(osc, 3, reverbMix);
      if (delayOn)  delay.process(osc, 0.2, delayMix, 2300);


      waveOscs.push(osc);
    }
    oscs[key] = waveOscs;

} else if (currentPreset === 4) {
  let midi = freqToMidi(freq);
  let nameList = Object.keys(pianoSamples);

  let best = nameList.reduce((a, b) =>
    Math.abs(noteNameToFreq(b) - freq) < Math.abs(noteNameToFreq(a) - freq) ? b : a
  );

    let sample = pianoSamples[best];
  if (sample && sample.isLoaded()) {
    let refFreq = noteNameToFreq(best);
    let rate = freq / refFreq;

    let sound = sample;
    let baseVol = volumeSlider.value();

    sound.rate(rate);
    sound.setVolume(baseVol * 5);

    if (reverbOn) reverb.process(sound, 3, reverbMix);
    if (delayOn)  delay.process(sound, 0.2, delayMix, 2300);

    sound.play();
    sound.setVolume(baseVol * 3, 0);
    sound.setVolume(0, 2, 0.5);
    sound.stop(2);

    oscs[key] = sound;


  } 
}

 else {
    let waveName = waveforms[0];
    let osc = new p5.Oscillator(waveName);
    osc.freq(freq);
    osc.start();

    if (fadeOn) {
      osc.amp(0, 0.05);
      osc.amp(0.3, 0.5);
    } else {
      osc.amp(0.3);
    }

    if (reverbOn) reverb.process(osc, 3, reverbMix);
    if (delayOn)  delay.process(osc, 0.2, delayMix, 2300);

    oscs[key] = osc;
  }
}

function updateFreqDisplay(freq) {
  displayPreviousFreq = displayCurrentFreq;
  displayCurrentFreq = freq;
}


function stopOscillator(key) {
  let oscObj = oscs[key];
  if (!oscObj) return;

  if (Array.isArray(oscObj)) {
    for (let o of oscObj) {
      if (fadeOn) {
        o.amp(0, 0.5);
      }
      o.stop(1);
    }
  } else {
    if (currentPreset === 4) {
      if (oscObj && typeof oscObj.setVolume === 'function') {
        let currentVol = volumeSlider.value() * 5;
        oscObj.setVolume(currentVol, 0);
        oscObj.setVolume(0, 0.3);
        oscObj.stop(0.3);
      } else {
        oscObj.stop();
      }
    } else {
      if (fadeOn) {
        oscObj.amp(0, 0.5);
      }
      oscObj.stop(1);
    }
  }

  delete oscs[key];
  delete activeKeys[key];
}



function drawKeyboard() {
  let keyLayout = [
    "1","2","3","4","5","6","7","8","9","0","-","^","\\",
    "q","w","e","r","t","y","u","i","o","p","@","[",
    "a","s","d","f","g","h","j","k","l",";",":","]",
    "z","x","c","v","b","n","m",",",".","/"
  ];

  let xOffset = 140;
  let yOffset = 300;
  let keyWidth = 40;
  let keyHeight = 40;

  for (let i = 0; i < keyLayout.length; i++) {
    let keyChar = keyLayout[i];
    let isPressed = activeKeys[keyChar];
    let keyX, keyY;

    if (i < 13) {
      keyX = xOffset + i * keyWidth;
      keyY = yOffset;
    } else if (i < 25) {
      keyX = xOffset + (i - 13) * keyWidth + 20;
      keyY = yOffset + keyHeight;
    } else if (i < 37) {
      keyX = xOffset + (i - 25) * keyWidth + 40;
      keyY = yOffset + 2 * keyHeight;
    } else {
      keyX = xOffset + (i - 37) * keyWidth + 60;
      keyY = yOffset + 3 * keyHeight;
    }

    fill(isPressed ? color(173, 216, 230) : color(255));
    stroke(0, 102, 204);
    strokeWeight(1);
    rect(keyX, keyY, keyWidth, keyHeight, 5);

    fill(0, 102, 204);
    textSize(13);
    textAlign(CENTER, CENTER);

    let ratio = keyMap[keyChar];
if (ratio) {
  text(`${keyChar}\n${ratio[0]}:${ratio[1]}`, keyX + keyWidth / 2, keyY + keyHeight / 2);
} else {
  text(keyChar, keyX + keyWidth / 2, keyY + keyHeight / 2);
}

  }
}

function updateCustomWaves() {
  for (let i = 0; i < 4; i++) {
    let symbol = waveSelects[i].value();
    let shapeName = symbolToShape(symbol);
    let ampVal = waveAmps[i].value();

    customWaves[i].shape = shapeName;
    customWaves[i].amp   = ampVal;
  }
}

function drawVisualizer() {
  fill(0, 102, 204, 1000);
  textSize(24);
  textAlign(CENTER, CENTER);
  let centerX = width / 2;
  let centerY = 120;

  text(`Pre: ${nf(displayPreviousFreq, 1, 2)} Hz`, centerX - 150, centerY);
  text(`Now: ${nf(displayCurrentFreq, 1, 2)} Hz`, centerX + 150, centerY);
  text("→", centerX, centerY);
}

function drawWaveform() {
  let waveform = fft.waveform();
  noFill();
  stroke(0, 102, 204);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, width);
    let y = map(waveform[i], -1, 1, 200, 300);
    vertex(x, y);
  }
  endShape();
}

function changePreset(preset) {
  currentPreset = preset;
  switch (preset) {
    case 0:
      waveforms = ['sine'];
      break;
    case 1:
      waveforms = ['triangle'];
      break;
    case 2:
      waveforms = ['square'];
      break;
    case 3:
      waveforms = ['sawtooth'];
      break;
    case 4:
      waveforms = ['piano'];
      break;
    case 5:
      waveforms = ['custom'];
      break;
    default:
      waveforms = ['sine'];
      break;
  }
  reverbOn = true;
  delayOn = true;
}


function mousePressed() {
    if (!started) {
  userStartAudio();
  started = true;
  playOscillator('start', baseFreq); 
  displayPreviousFreq = baseFreq;
  displayCurrentFreq = baseFreq;

  setTimeout(() => {
    stopOscillator('start'); 
  }, 200);

  return;
}

  let keyLayout = [
  "1","2","3","4","5","6","7","8","9","0","-","^","\\",
  "q","w","e","r","t","y","u","i","o","p","@","[",
  "a","s","d","f","g","h","j","k","l",";",":","]",
  "z","x","c","v","b","n","m",",",".","/"
];
  let xOffset = 140;
  let yOffset = 300;
  let keyWidth = 40;
  let keyHeight = 40;

  for (let i = 0; i < keyLayout.length; i++) {
    let keyChar = keyLayout[i];
    let keyX, keyY;

    if (i < 13) keyX = xOffset + i * keyWidth, keyY = yOffset;
    else if (i < 25) keyX = xOffset + (i - 13) * keyWidth + 20, keyY = yOffset + keyHeight;
    else if (i < 37) keyX = xOffset + (i - 25) * keyWidth + 40, keyY = yOffset + 2 * keyHeight;
    else keyX = xOffset + (i - 37) * keyWidth + 60, keyY = yOffset + 3 * keyHeight;

    if (
      mouseX >= keyX && mouseX <= keyX + keyWidth &&
      mouseY >= keyY && mouseY <= keyY + keyHeight
    ) {
      let ratio = keyMap[keyChar];
      if (ratio && !oscs[keyChar]) {
        let newFreq = displayCurrentFreq * (ratio[0] / ratio[1]);
        playOscillator(keyChar, newFreq);
        //displayPreviousFreq = displayCurrentFreq;
        //displayCurrentFreq = newFreq;
        activeKeys[keyChar] = true;
        
        if (isRecording && ratio) {
  recordedEvents.push({
    time: sequenceCurrentTime,
    ratio: ratio,
    length: 300 
  });
}


      }
    }
  }
  
}

function touchStarted() {
  if (!started) {
  userStartAudio();
  started = true;
  playOscillator('start', baseFreq); 
  displayPreviousFreq = baseFreq;
  displayCurrentFreq = baseFreq;

  setTimeout(() => {
    stopOscillator('start');
  }, 200); 

  return;
}



  mousePressed(); 
}


function mouseReleased() {
  stopTouchedKey(mouseX, mouseY);
  if (isRecording) {
  let now = millis();
  let timeSinceStart = now - sequenceStartTime;

  let last = recordedEvents[recordedEvents.length - 1];
  if (last && !last.released && typeof last.time === 'number') {
    last.length = timeSinceStart - last.time;
    last.released = true;
  }
}


}

function touchEnded() {
  stopTouchedKey(mouseX, mouseY); 
}

function stopTouchedKey(x, y) {
  let keyLayout = [
    "1","2","3","4","5","6","7","8","9","0","-","^","\\",
    "q","w","e","r","t","y","u","i","o","p","@","[",
    "a","s","d","f","g","h","j","k","l",";",":","]",
    "z","x","c","v","b","n","m",",",".","/"
  ];
  let xOffset = 140;
  let yOffset = 300;
  let keyWidth = 40;
  let keyHeight = 40;

  for (let i = 0; i < keyLayout.length; i++) {
    let keyChar = keyLayout[i];
    let keyX, keyY;

    if (i < 13) {
      keyX = xOffset + i * keyWidth;
      keyY = yOffset;
    } else if (i < 25) {
      keyX = xOffset + (i - 13) * keyWidth + 20;
      keyY = yOffset + keyHeight;
    } else if (i < 37) {
      keyX = xOffset + (i - 25) * keyWidth + 40;
      keyY = yOffset + 2 * keyHeight;
    } else {
      keyX = xOffset + (i - 37) * keyWidth + 60;
      keyY = yOffset + 3 * keyHeight;
    }

    if (
      x >= keyX && x <= keyX + keyWidth &&
      y >= keyY && y <= keyY + keyHeight
    ) {
      if (oscs[keyChar]) {
        stopOscillator(keyChar);
      }
    }
  }
}

function freqToMidii(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

function noteNameToFreq(note) {
  const name = note.slice(0, -1);
  const octave = parseInt(note.slice(-1));
  const noteMap = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
  };
  const semitone = noteMap[name];
  const midi = 12 * (octave + 1) + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}


let sequencePanel;
let sequencePanelVisible = false;
let sequenceInput;
let sequencePlayPauseBtn, sequenceStopBtn, sequenceResetBtn;
let sequenceTimeInput, bpmInput;
let sequenceCurrentTime = 0;
let sequenceStartTime = 0;
let sequenceActive = false;
let sequencePaused = false;
let sequenceEvents = [];
let sequencePauseOffset = 0;
let bpm = 120;
let scheduledFreqChange = null;

let isRecording = false;
//let recordStartTime = 0;
let recordedEvents = [];

let panelWidth = 750;

function setupSequencePanel(wrapper) {
  let toggleSeqBtn = createButton('Sequence');
  toggleSeqBtn.parent(wrapper);
  toggleSeqBtn.position(709, 430);
  toggleSeqBtn.mousePressed(() => {
    sequencePanelVisible = !sequencePanelVisible;
    sequencePanel.style('display', sequencePanelVisible ? 'block' : 'none');
  });

sequencePanel = createDiv();
sequencePanel.parent(wrapper);
sequencePanel.size(panelWidth, 180);
sequencePanel.position((width - panelWidth) / 2 - 15, height + 10);
  sequencePanel.style('padding', '10px');
  sequencePanel.style('border', '1px solid #999');
  sequencePanel.style('background', '#fff');
  sequencePanel.style('display', 'none');
  
  

  let controlRow = createDiv();
  controlRow.parent(sequencePanel);
  controlRow.style('display', 'flex');
  controlRow.style('align-items', 'center');
  controlRow.style('justify-content', 'center');
  controlRow.style('gap', '10px');
  controlRow.style('margin-bottom', '10px');

  sequenceResetBtn = createButton('⏮');
  sequenceResetBtn.parent(controlRow);
  sequenceResetBtn.mousePressed(() => {
  sequenceCurrentTime = 0;
  sequenceStartTime = millis();
  sequenceTimeInput.value('0');
  sequenceActive = false;
  sequenceEvents.forEach(evt => evt.played = false);
});



  sequencePlayPauseBtn = createButton('⏵');
  sequencePlayPauseBtn.parent(controlRow);
  sequencePlayPauseBtn.mousePressed(() => {
    if (!sequenceActive) {
      startSequence();
      sequencePlayPauseBtn.html('⏸');
    } else {
      if (sequencePaused) {
        resumeSequence();
        sequencePlayPauseBtn.html('⏸');
      } else {
        pauseSequence();
        sequencePlayPauseBtn.html('⏵');
      }
    }
  });

  //sequenceStopBtn = createButton('⏹');
  //sequenceStopBtn.parent(controlRow);
  //sequenceStopBtn.mousePressed(() => {
    //stopSequence();
    //sequencePlayPauseBtn.html('⏵');
  //});
  
  let recordBtn = createButton('●');
recordBtn.parent(controlRow);
  
  
recordBtn.mousePressed(() => {
  if (!isRecording) {
    updateSequence();
    isRecording = true;
    recordedEvents = [];
    sequenceActive = true;
sequencePaused = false;
sequenceStartTime = millis() - sequenceCurrentTime;
    sequenceCurrentTime = millis() - sequenceStartTime;
sequenceTimeInput.value((sequenceCurrentTime / 1000).toFixed(2));

    recordBtn.html('⏹');
  } else {
    isRecording = false;
    sequenceActive = false; 
    recordBtn.html('●');

    let existing = sequenceInput.value().trim();
    let lines = recordedEvents.map(evt => {
      let timeStr = `${Math.round(evt.time)}ms`;
      let ratioStr = `${evt.ratio[0]}:${evt.ratio[1]}`;
      let lenStr = `${Math.round(evt.length)}ms`;
      return `${timeStr}, ${ratioStr}, ${lenStr}`;
    });

    const joined = (existing ? existing + '\n' : '') + lines.join('\n');
    sequenceInput.value(joined);
  }
});





  sequenceTimeInput = createInput('0');
  sequenceTimeInput.parent(controlRow);
  sequenceTimeInput.size(80);
  sequenceTimeInput.input(() => {
    let sec = parseFloat(sequenceTimeInput.value());
    if (!isNaN(sec)) {
      sequenceCurrentTime = sec * 1000;
      sequenceStartTime = millis() - sequenceCurrentTime;
      sequenceEvents.forEach(evt => evt.played = false);
    }
  });

  let timeLabel = createSpan('秒');
  timeLabel.parent(controlRow);

  bpmInput = createInput(bpm.toString());
  bpmInput.parent(controlRow);
  bpmInput.size(60);
  bpmInput.input(() => {
    let val = parseInt(bpmInput.value());
    if (!isNaN(val)) bpm = val;
  });
  
  
  let bpmLabel = createSpan('BPM');
bpmLabel.parent(controlRow);

  let label = createDiv('Sequence Input:');
  label.parent(sequencePanel);
  label.style('margin-top', '-24px'); 

  sequenceInput = createElement('textarea');
  sequenceInput.parent(sequencePanel);
  sequenceInput.style('width', '100%');
sequenceInput.style('box-sizing', 'border-box');
sequenceInput.style('height', '120px');
  sequenceInput.value("100ms, prefreq=490\n800ms, 3:4, 3500ms\n1700ms, 11:7, 3500ms\n5拍, 10:9, 3000ms\n3400ms, 3:2, 2500ms");
  sequenceInput.style('margin-top', '0px');
  


}

function startSequence() {
  sequenceEvents = [];
  let lines = sequenceInput.value().split('\n');
  for (let line of lines) {
    let parts = line.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      let timeStr = parts[0];
      let time;
      if (timeStr.includes('拍')) {
        time = parseFloat(timeStr) * (60000 / bpm);
      } else if (timeStr.includes('ms')) {
        time = parseFloat(timeStr);
      } else if (timeStr.includes('s')) {
        time = parseFloat(timeStr) * 1000;
      } else {
        time = parseInt(timeStr);
      }

      let length = 300;
      if (parts.length >= 3) {
        let lenStr = parts[2];
        if (lenStr.includes('拍')) {
          length = parseFloat(lenStr) * (60000 / bpm);
        } else if (lenStr.includes('ms')) {
          length = parseFloat(lenStr);
        } else if (lenStr.includes('s')) {
          length = parseFloat(lenStr) * 1000;
        } else {
          length = parseInt(lenStr);
        }
      }

      if (parts[1].startsWith('prefreq=')) {
        let freqVal = parseFloat(parts[1].split('=')[1]);
        if (!isNaN(time) && !isNaN(freqVal)) {
          sequenceEvents.push({ time, type: 'prefreq', freq: freqVal, played: false });
        }
      } else {
        let ratio = parts[1].split(':').map(Number);
        if (!isNaN(time) && ratio.length === 2 && !ratio.includes(NaN)) {
          sequenceEvents.push({ time, type: 'note', ratio, length, played: false });
        }
      }
    }
  }

  if (!isRecording) {
    sequenceStartTime = millis() - sequenceCurrentTime;
    sequencePauseOffset = 0;
  }

  sequenceActive = true;
  sequencePaused = false;
}


function pauseSequence() {
  sequencePaused = true;
  sequencePauseOffset = millis() - sequenceStartTime;
}

function resumeSequence() {
  sequencePaused = false;
  sequenceStartTime = millis() - sequencePauseOffset;
}

function stopSequence() {
  sequenceActive = false;
  sequencePaused = false;
  sequenceEvents = [];
  sequenceTimeInput.value('0');
}

function updateSequence() {
  if (!sequenceActive && !isRecording) return;
  if (sequencePaused) return;

  let now = millis();
  //sequenceCurrentTime = now - sequenceStartTime;
  //sequenceTimeInput.value((sequenceCurrentTime / 1000).toFixed(2));

  for (let evt of sequenceEvents) {
    if (!evt.played && sequenceCurrentTime >= evt.time) {
      if (evt.type === 'prefreq') {
        displayCurrentFreq = evt.freq;
      } else if (evt.type === 'note') {
        let freq = displayCurrentFreq * (evt.ratio[0] / evt.ratio[1]);
        let id = 'seq-' + evt.time + '-' + Math.random();
        playOscillator(id, freq);
        setTimeout(() => stopOscillator(id), evt.length);
      }
      evt.played = true;
    }
  }
}
