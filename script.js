import { HarmBlockThreshold, HarmCategory, GoogleGenerativeAI } from "@google/generative-ai";
const outputDiv = document.getElementById('output');
const statusDiv = document.getElementById('status');
const startButton = document.getElementById('startButton');

const sleep = ms => new Promise(r => setTimeout(r, ms));

let api_keys = [
    "V3JpdHRlbiBieSBBdXN0aW4gUGhpbGxpcHMgQXVnLVNlcCAyMDI0",
    "AIzaSyAkNOjhY-ayGISlV2yHXWIjrA-v0VOojHE",
    "VEhJUyBXQVMgTVkgSURFQS4gRmFsbCBvZiAyMDIz",
    "QWRkaXRpb25hbCBMaWJyYXJpZXMgTGljZW5zZXMgaW5jbHVkZWQ="
];

const API_KEY = api_keys[1];

// Access your API key (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(API_KEY);

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

var model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: `You greet students, answer their questions, and speak in a friendly tone.`, safetySettings});

let recognition; // SpeechRecognition instance
let isListening = false;
let isSpeaking = false;
let speechSynthesisUtterance;

let voices = [];

function setSpeech() {
    return new Promise(
        function (resolve, reject) {
            let synth = window.speechSynthesis;
            let id;

            id = setInterval(() => {
                if (synth.getVoices().length !== 0) {
                    resolve(synth.getVoices());
                    clearInterval(id);
                }
            }, 10);
        }
    )
}

let s = setSpeech();
s.then(v => {voices = v;
    let listBox = document.getElementById("voices");
    let i = 0;
    for (let voice of voices) {
        let element = document.createElement("option");
        element.textContent = voice.voiceURI.toString().replace("Microsoft ", "");
        element.value = i;
        listBox.appendChild(element);

    }
    console.log(voices);
});

let fullContext = "";
let count = 0;

function initializeSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!window.SpeechRecognition) {
        statusDiv.textContent = "Speech recognition is not supported in this browser.";
        startButton.disabled = true;
        return;
    }

    recognition = new window.SpeechRecognition();
    recognition.lang = 'en-US'; // You can change the language
    recognition.interimResults = false; // Only final results
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        statusDiv.textContent = "Listening...";
        isListening = true;
    };

    recognition.onresult = async (event) => {
        const speechResult = event.results[0][0].transcript;
        //outputDiv.textContent = "You said: " + speechResult;
        statusDiv.textContent = "Processing...";
        await processUserSpeech(speechResult); // Call function to handle the transcribed text
    };

    recognition.onspeechend = () => {
        statusDiv.textContent = "Acknowledged response";
        count = 0;
        stopListening(); // Stop listening when speech ends
    };

    recognition.onerror = async (event) => {
        console.error("Speech Recognition Error:", event.error);
        statusDiv.textContent = "Error: " + event.error;
        if (event.error.toString() == "no-speech") {
            //This is the best thing ever
            count++;
            if (count > 5) {
                count = 0;
                fullContext = "";
            }
        }
        stopListening();
        await sleep(200);
        startListening();
    };

    recognition.onend = () => {
        isListening = false;
        /*if (!isSpeaking) {
            // Restart listening only if not currently speaking
            startListening();
        }*/
    };
}


function startListening() {
    if (recognition && !isListening && !isSpeaking) {
        try {
            recognition.start();
        } catch (error) {
            console.error("Error starting recognition:", error);
            statusDiv.textContent = "Error starting: " + error.message;
            isListening = false;
        }
    }
}

function stopListening() {
    if (recognition && isListening) {
        recognition.stop();
        isListening = false;
    }
}

function speak(text) {
    if ('speechSynthesis' in window) {
        isSpeaking = true;
        s = setSpeech();
        s.then(v => {
            speechSynthesisUtterance = new SpeechSynthesisUtterance(text);
        let getDesiredVoice = document.getElementById("voices").selectedIndex;
        if (v.length > getDesiredVoice) {
            speechSynthesisUtterance.voice = v[getDesiredVoice];
        } else {
            speechSynthesisUtterance.voice = v[14];
        }

        speechSynthesisUtterance.rate = document.getElementById("rate").value;

        speechSynthesisUtterance.onstart = () => {
            statusDiv.textContent = "Speaking...";
            if (getMode() == "greeter") {
                targetColor = {r: 50, g: 50, b: 255};
            } else {
                targetColor = {r: 50, g: 255, b: 50};
            }
        };

        speechSynthesisUtterance.onend = () => {
            isSpeaking = false;
            statusDiv.textContent = "Speaking complete.";
            if (getMode() == "greeter") {
                targetColor = {r: 0, g: 0, b: 255};
            } else {
                targetColor = {r: 0, g: 255, b: 0};
            }
            // Restart listening after speaking is done
            startListening();
        };

        speechSynthesisUtterance.onerror = (event) => {
            console.error("TTS Error:", event.error);
            statusDiv.textContent = "TTS Error: " + event.error;
            isSpeaking = false;
            startListening();  // Try to recover and listen again
        };

        window.speechSynthesis.speak(speechSynthesisUtterance);
        })
    } else {
        statusDiv.textContent = "Text-to-speech not supported.";
        isSpeaking = false;
    }
}

function getGreeterPrompt() {

    var time = new Date();
    let formattedTime = time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })

    let greeterPrompt = `You are a greeter for Tarrant County College students and visitors. Should it come up, your name is Cassidy, but don't bring it up yourself.

    Your job is to continue, as a greeter, the following conversation. If it has not been done yet, ask users for their name and refer to them by it.

    You are allowed to discuss the following material:
    - All Learning Commons services (Library and Learning Centers) are open 7:30 am - 9:00 pm Monday through Thursday, 7:30 - 5:00 pm Friday, and 10:00 - 4:00 pm Saturday.
    - The Math Learning Center is open to all students, but specifically serves math and physics students best.
    - Assistants are available to assist you with your work if you need it, but they will not assist with quizzes or exams.
    - Assistants are knowledgeable on Algebra, Pre-calculus, Trigonometry, Statistics, Calculus, Contemporary Math, Differential Equations, Discrete Math, Physics, and more.
    - If you need to take an exam, ask a tutor for assistance.
    - If you need to make up an exam, you may be able to use the Math Testing Center. Talk to a tutor to get additional information.

    You are also allowed to make general smalltalk with students. You may respond in the same language the student has spoken to you in, you can speak any language.

    It is currently ${formattedTime}. If that time is past 8:30 pm, inform the student that the Math Learning Center will be closing soon (if it has not been done already).

    Simply provide your response, with no formatting. Keep your response under 30 words.
    
    The conversation begins below:`

    return greeterPrompt;
}

function getSidekickPrompt() {
    let sidekickPrompt = `You are an assistant for Tarrant County College students and visitors.  Should it come up, your name is Cassidy, but don't bring it up yourself.

    Your job is to continue, as an assistant, the following conversation.

    You assist students in their learning. They may ask you questions and you will answer them.
    Your answers are no longer than 100 words. Your responses should be informative and factual.
    You should inquire as to the subject that the student is studying, if you have not done so.
    While you should entertain them with smalltalk if they so desire, you should not allow it to persist long, and you should work to keep them focused.
    
    The conversation begins below:`

    return sidekickPrompt;
}

const radioButtons = document.getElementsByName("myOptions");

function getMode() {
    let selectedValue = "greeter";

    // Loop through the radio buttons to find the selected one
    for (let i = 0; i < radioButtons.length; i++) {
        if (radioButtons[i].checked) {
        selectedValue = radioButtons[i].value;
        break; // Exit the loop once a selected button is found
        }
    }
    return selectedValue;
}

for (let button of radioButtons) {
    button.addEventListener("change", () => {
        console.log("RESET");
        fullContext = "";
    });
}



async function processUserSpeech(speechResult) {
    // Replace this with your logic to generate a response based on speechResult
    let responseText;

    fullContext += `\nUser: ${speechResult} \n`;


    let p = "";
    if (getMode() == "greeter") {
        p = getGreeterPrompt();
    } else {
        p = getSidekickPrompt();
    }

    let prompt = `${p} \n\n ${fullContext}`

    console.log(prompt);

    if (getMode() == "greeter") {
        targetColor = {r: 0, g: 0, b: 50};
    } else {
        targetColor = {r: 0, g: 50, b: 0};
    }
    responseText = await getResponse(prompt, model);
    
    responseText = responseText.text;
    fullContext += `\nAI: ${responseText} \n`

    outputDiv.textContent = responseText;
    console.log(responseText);

    speak(responseText);
}



async function getResponse(prompt, mdl, depth) {
    if (mdl == null) {
        mdl = model;
    }
    //const prompt = textbox.value;
    if (depth == null) {
        depth = 0;
    }
    let contents = "";
    try {
        //console.log(prompt);
        let respo = await mdl.generateContent(prompt);
        respo = respo.response;
        
        //const result = respo.text();
        contents = respo;
        //console.log("**********RESULT*********\n\n\n\n\n\n");
        console.log(respo);
    } catch (error) {
        console.log(error);
        if (depth < 3) {
            contents = await getResponse(prompt,mdl, depth+1);
        }
        else {
            return {"contents":null, "text":"I'm sorry, can you please say that one more time for me?", "citations":null};
        }
    }
    
    return {"contents":contents, "text":contents.text(), "citations":contents.candidates[0].citationMetadata};
}


// Event Listeners
startButton.addEventListener('click', () => {
    if (!isListening && !isSpeaking) {
        startListening();
    }
});

function lerp(a, b, t) {
    return a * (1-t) + b * t;
}

let color = {r: 0, g: 0, b: 0};
let targetColor = {r: 0, g: 0, b: 255};


const speechPart1 = document.getElementById('circle1');
const speechPart2 = document.getElementById('circle2');
const speechPart3 = document.getElementById('circle3');

let t = 0;
let factor = 1;
window.setInterval(() => {
    color = {r: lerp(color.r, targetColor.r, 0.05), g: lerp(color.g, targetColor.g, 0.05), b: lerp(color.b, targetColor.b, 0.05)};
    let newFactor = 1 * (isListening ? 0.4 : 1) * (isSpeaking ? 1.5 : 1);
    factor = lerp(factor, newFactor, 0.05);

    let f1 = (Math.abs(Math.sin(t)) * 0.75 + 0.25);
    let speech1Height =  f1* factor * 200;
    speechPart1.style.height = `${speech1Height}px`

    let f2 = (Math.abs(Math.sin(t+0.2)) * 0.75 + 0.25);
    let speech2Height = f2 * factor * 200;
    speechPart2.style.height = `${speech2Height}px`

    let f3 = (Math.abs(Math.sin(t+0.4)) * 0.75 + 0.25);
    let speech3Height = f3 * factor * 200;
    speechPart3.style.height = `${speech3Height}px`

    let speech1Color = {r: lerp(0.5, color.r, Math.pow(f1, 2)), g: lerp(0.5, color.g, Math.pow(f1, 2)), b: lerp(0.5, color.b, Math.pow(f1, 2))};
    speechPart1.style.backgroundColor = `rgb(${speech1Color.r}, ${speech1Color.g}, ${speech1Color.b})`;

    let speech2Color = {r: lerp(0.5, color.r, Math.pow(f2, 2)), g: lerp(0.5, color.g, Math.pow(f2, 2)), b: lerp(0.5, color.b, Math.pow(f2, 2))};
    speechPart2.style.backgroundColor = `rgb(${speech2Color.r}, ${speech2Color.g}, ${speech2Color.b})`;

    let speech3Color = {r: lerp(0.5, color.r, Math.pow(f3, 2)), g: lerp(0.5, color.g, Math.pow(f3, 2)), b: lerp(0.5, color.b, Math.pow(f3, 2))};
    speechPart3.style.backgroundColor = `rgb(${speech3Color.r}, ${speech3Color.g}, ${speech3Color.b})`;


    
    t+= 0.02;
}, 10)



// Initialize
initializeSpeechRecognition();